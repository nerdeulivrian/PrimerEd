import { PRESS_MS, type SessionStore } from '../session/store'
import { api } from './api'
import { Voice, type AgentMessage } from './voice'

/** What the app shows around the lesson while the live session gets going or ends. */
export type LiveStatus =
  | { kind: 'loading' }
  /** The lesson is loaded: the player shows (START, or "Your tutor is getting ready…"). */
  | { kind: 'ready' }
  | { kind: 'error'; text: string; backUrl?: string }
  | { kind: 'leaving' }

interface ToolCall {
  callId: string
  name: string
  args: Record<string, unknown>
}

/**
 * Gemini makes its audio faster than it plays, so a function call arrives while
 * the tutor is still saying what comes before it (up to ~15 s before, after a
 * long narration). Each call waits until the voice has caught up: the agent's
 * audio quiet for QUIET_MS (or Agora says it has stopped speaking). Gemini waits
 * for the result, so the screen changes when the voice gets there.
 */
const QUIET_MS = 700
const QUIET_LEVEL = 0.02
/** Never hold a call longer than this (the backend gives up at 35 s). */
const MAX_HOLD_MS = 25_000

/** Whether this page may play sound without a tap (the browser's autoplay policy). */
function soundAllowed() {
  try {
    const ctx = new AudioContext()
    const allowed = ctx.state === 'running'
    void ctx.close()
    return allowed
  } catch {
    return false
  }
}

/**
 * The real lesson voice session, opened from landing with `?launch=<code>`:
 * - load the level from the code and show it;
 * - on START (or straight away, if the browser allows sound without a tap):
 *   the backend starts the level's Gemini 3.8 Live agent through Agora, and
 *   the browser joins its channel;
 * - the agent's function calls arrive over SSE, run on the store like the
 *   simulator's, and their results go back to the agent;
 * - after exit_lesson, back to the level path in landing.
 */
export class LessonLive {
  private readonly store: SessionStore
  private readonly code: string
  private status: LiveStatus = { kind: 'loading' }
  private listeners = new Set<() => void>()
  private voice: Voice | null = null
  private events: EventSource | null = null
  private sessionId: string | null = null
  private backUrl: string | null = null
  private started = false
  private agentSpeaking = false
  /** Calls run one at a time, in order. */
  private queue: Promise<void> = Promise.resolve()

  constructor(store: SessionStore, code: string) {
    this.store = store
    this.code = code
    window.addEventListener('pagehide', () => {
      if (this.sessionId) api.stopBeacon(this.sessionId)
    })
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getStatus = () => this.status

  private onStatus(status: LiveStatus) {
    this.status = status
    this.listeners.forEach((l) => l())
  }

  /**
   * If the browser allows sound without a tap, starts straight away (the lesson
   * comes with the session). Otherwise shows the level and waits for START.
   */
  async load() {
    if (soundAllowed()) return this.tapStart()
    try {
      const { lesson } = await api.launch(this.code)
      this.store.load(lesson)
      this.onStatus({ kind: 'ready' })
    } catch (err) {
      this.onStatus({ kind: 'error', text: (err as Error).message })
    }
  }

  /** START (or no tap needed): opens the mic and the session. */
  tapStart() {
    if (this.started) return
    this.started = true
    void this.start()
  }

  private async start() {
    try {
      // The mic and the session at once. The tutor is usually up already: openLevel started it.
      const [mic, started] = await Promise.allSettled([Voice.openMic(), api.start(this.code)])
      if (mic.status === 'rejected' || started.status === 'rejected') {
        if (mic.status === 'fulfilled') mic.value.close()
        if (started.status === 'fulfilled') api.stop(started.value.sessionId)
        throw mic.status === 'rejected' ? mic.reason : (started as PromiseRejectedResult).reason
      }
      const session = started.value
      this.store.load(session.lesson)
      this.store.tapStart()
      this.onStatus({ kind: 'ready' })
      this.sessionId = session.sessionId
      this.backUrl = session.backUrl
      this.events = api.events(session.sessionId)
      this.listen(this.events)
      this.voice = new Voice((m) => this.onAgent(m))
      await this.voice.join(session.rtc, mic.value)
    } catch (err) {
      console.error(err)
      await this.end()
      const denied = err instanceof Error && /permission|NotAllowed/i.test(err.message)
      this.onStatus({
        kind: 'error',
        text: denied ? 'PrimerEd needs your microphone' : (err as Error).message || "Couldn't connect to PrimerEd",
        backUrl: this.backUrl ?? undefined,
      })
    }
  }

  async end() {
    this.events?.close()
    this.events = null
    await this.voice?.leave()
    this.voice = null
    if (this.sessionId) api.stop(this.sessionId)
    this.sessionId = null
  }

  private onAgent(m: AgentMessage) {
    if (m.object === 'message.state') this.agentSpeaking = m.state === 'speaking'
  }

  private listen(events: EventSource) {
    events.addEventListener('tool', (e) => {
      const { callId, name, args } = JSON.parse((e as MessageEvent).data) as ToolCall
      this.queue = this.queue.then(async () => {
        await this.voiceCaughtUp()
        const result = this.store.call({ name, args })
        if (this.sessionId) api.result(this.sessionId, callId, result)
        if (name === 'exit_lesson' && !('error' in result)) void this.leave()
      })
    })
  }

  private async voiceCaughtUp() {
    const start = Date.now()
    let quietSince = 0
    while (this.voice && Date.now() - start < MAX_HOLD_MS) {
      if (this.voice.agentVolume() >= QUIET_LEVEL) quietSince = 0
      else {
        quietSince ||= Date.now()
        if (!this.agentSpeaking || Date.now() - quietSince >= QUIET_MS) return
      }
      await new Promise((r) => setTimeout(r, 50))
    }
  }

  /** After EXIT (the goodbye has played by now): back to the level path. */
  private async leave() {
    // EXIT's press plays, then "Back to your levels" (rather than the entry screen exit_lesson resets to).
    await new Promise((r) => setTimeout(r, PRESS_MS))
    this.onStatus({ kind: 'leaving' })
    await new Promise((r) => setTimeout(r, 500))
    const url = this.backUrl
    await this.end()
    if (url) window.location.assign(url)
  }
}
