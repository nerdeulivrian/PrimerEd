import type { HomeStore } from '../home/store'
import type { Experience, Generation, View } from '../home/types'
import { api } from './api'
import { Voice, type AgentMessage } from './voice'

/** Transcript text without Gemini's markers, e.g. "<no speech>" or "{pause}". */
const spoken = (text: string) => text.replace(/<[^>]*>|\{[^}]*\}/g, ' ').replace(/\s+/g, ' ').trim()

interface ToolCall {
  callId: string
  name: string
  args: Record<string, unknown>
}

/**
 * The real home voice session, in place of the demo script. The orb tap starts
 * it: the backend starts a Gemini 3.8 Live agent (through Agora), the browser
 * joins its channel, and then:
 * - the agent's transcripts arrive over the channel → the thread and captions
 * - the backend's events arrive over SSE → the stepper, and the tool calls the
 *   agent makes (open a tab, an experience, a level), which run on the store
 *   and post their result back.
 */
export class Live {
  readonly store: HomeStore
  private voice: Voice | null = null
  private events: EventSource | null = null
  private sessionId: string | null = null
  private run = 0
  /** When openExperience last ran: a stray openTab("experience") right after it is ignored. */
  private pathOpenedAt = 0
  /** Set by openLevel: where to go once the AI has said its last line. */
  private launch: { url: string; timer: number } | null = null

  constructor(store: HomeStore) {
    this.store = store
    window.addEventListener('pagehide', () => {
      if (this.sessionId) api.stopBeacon(this.sessionId)
    })
  }

  /** The learner's saved experiences, on load. */
  async load() {
    try {
      this.store.setExperiences(await api.experiences())
    } catch (err) {
      console.warn('Could not load experiences:', err)
    }
  }

  /** Call from the tap (orb or Start over), so the browser allows the mic and sound. */
  async start() {
    const run = ++this.run
    try {
      const mic = await Voice.openMic()
      const { sessionId, rtc } = await api.startHome()
      if (run !== this.run) {
        mic.close()
        api.stop(sessionId)
        return
      }
      this.sessionId = sessionId
      this.events = api.events(sessionId)
      this.listen(this.events)
      this.voice = new Voice((m) => this.onAgent(m))
      await this.voice.join(rtc, mic)
    } catch (err) {
      if (run !== this.run) return
      console.error(err)
      await this.end()
      const denied = err instanceof Error && /permission|NotAllowed/i.test(err.message)
      this.store.stop(denied ? 'PrimerEd needs your microphone' : "Couldn't connect to PrimerEd")
    }
  }

  /** Stop, or before Start over. */
  async end() {
    this.run++
    if (this.launch) clearTimeout(this.launch.timer)
    this.launch = null
    this.events?.close()
    this.events = null
    await this.voice?.leave()
    this.voice = null
    if (this.sessionId) api.stop(this.sessionId)
    this.sessionId = null
  }

  private onAgent(m: AgentMessage) {
    const { store } = this
    switch (m.object) {
      case 'assistant.transcription': {
        const { turn_id, text, turn_status } = m as Extract<AgentMessage, { object: 'assistant.transcription' }>
        const clean = spoken(text)
        if (clean) store.aiText(`a${turn_id}`, clean)
        if (turn_status !== 0 && this.launch) this.goToLesson()
        break
      }
      case 'user.transcription': {
        const { turn_id, text } = m as Extract<AgentMessage, { object: 'user.transcription' }>
        const clean = spoken(text)
        if (clean) store.heardText(`u${turn_id}`, clean)
        break
      }
      case 'message.state':
        store.agentState(String(m.state))
        break
      case 'message.interrupt':
        if (this.launch) this.goToLesson()
        break
    }
  }

  private listen(events: EventSource) {
    const on = <T>(name: string, handle: (data: T) => void) =>
      events.addEventListener(name, (e) => handle(JSON.parse((e as MessageEvent).data)))
    on<Generation>('generation', (g) => {
      if (this.store.getSnapshot().generation) this.store.updateGeneration(g)
      else this.store.startGeneration(g)
      // The mic is off while the experience is made: Gemini is waiting on the tool call,
      // and talking now could interrupt it. It comes back on when it's ready (or fails).
      const making = g.active < 4
      if (making) this.store.setStatus('Making your experience…')
      this.voice?.setMuted(making)
    })
    on<Experience>('experienceReady', (e) => {
      this.voice?.setMuted(false)
      this.store.experienceReady(e)
    })
    on('generationFailed', () => {
      this.voice?.setMuted(false)
      this.store.generationFailed()
    })
    on<ToolCall>('tool', async (call) => {
      const result = await this.tool(call).catch((err: Error) => ({ success: false, error: err.message }))
      if (this.sessionId) api.result(this.sessionId, call.callId, result)
    })
  }

  private async tool({ name, args }: ToolCall): Promise<unknown> {
    const { store } = this
    switch (name) {
      case 'openTab': {
        // The AI sometimes also calls openTab("experience") around openExperience, in either
        // order. Right after a path opened, that would cover it with the Experience tab.
        if (args.tab === 'experience' && Date.now() - this.pathOpenedAt < 4000) return { success: true }
        store.openTab(args.tab as Exclude<View, 'path'>)
        return { success: true }
      }
      case 'openExperience': {
        const id = String(args.experienceId)
        if (!store.getSnapshot().experiences.some((e) => e.id === id)) await this.load()
        // As designed: the Experience tab briefly, then the level path.
        this.pathOpenedAt = Date.now()
        if (store.getSnapshot().view !== 'experience') {
          store.openTab('experience')
          await new Promise((r) => setTimeout(r, 1200))
        }
        store.openExperience(id)
        this.pathOpenedAt = Date.now()
        return { success: true }
      }
      case 'openLevel': {
        store.setStatus(`Opening level ${args.level}…`)
        // Go once the AI's goodbye line is over, or after a few seconds if it says nothing.
        this.launch = { url: String(args.url), timer: window.setTimeout(() => this.goToLesson(), 8000) }
        return { success: true }
      }
    }
    return { success: false, error: `Unknown function ${name}` }
  }

  private async goToLesson() {
    const url = this.launch?.url
    if (!url) return
    await this.end()
    window.location.assign(url)
  }
}
