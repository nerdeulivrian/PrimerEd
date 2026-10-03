import { useSyncExternalStore } from 'react'
import { solarSystem, status } from './data'
import type { Experience, Generation, HomeState, Turn, View } from './types'

export function initialState(experiences: Experience[] = [solarSystem]): HomeState {
  return {
    phase: 'welcome',
    view: 'home',
    thread: [],
    generation: null,
    status: status.listening,
    speaking: false,
    caption: null,
    experiences,
    openId: null,
    shell: false,
    badge: false,
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/**
 * The home voice session's state. Each method is something the voice AI will
 * do with a function call (say, open a tab, …) or one of the learner's taps
 * (START, Stop, Start over). Today the demo script and the debug panel call
 * them; later the real Gemini Live tool-call handler can.
 */
export class HomeStore {
  private state: HomeState
  private listeners = new Set<() => void>()
  private nextId = 1
  /** Live transcripts: which turn (or caption) each transcript key is drawing into, and its text so far. */
  private aiLine: { key: string; text: string; turnId: number | null; captionId: number | null } | null = null
  private learnerTurns = new Map<string, number>()
  /** The experiences a fresh state starts with: sample data in the demo, the learner's own when live. */
  private saved: Experience[]

  constructor(experiences?: Experience[]) {
    this.saved = experiences ?? [solarSystem]
    this.state = initialState(this.saved)
  }
  /** Playback speed of the demo script. */
  speed = 1

  setSpeed(speed: number) {
    this.speed = speed
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.state

  private set(patch: Partial<HomeState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }

  private turn(turn: DistributiveOmit<Turn, 'id'>) {
    this.set({ thread: [...this.state.thread, { ...turn, id: this.nextId++ } as Turn] })
  }

  /** The one real tap: the orb on the welcome screen opens the voice session. */
  tapStart() {
    if (this.state.phase !== 'welcome') return
    this.set({ phase: 'live', view: 'home', status: status.listening })
  }

  /**
   * A piece of what the AI is saying. Speech-to-speech streams its transcript
   * in pieces (a word or a few) alongside the audio: the first piece of a
   * reply starts a turn (in the conversation) or a floating caption
   * (elsewhere), and the rest add on until `listen()`.
   */
  stream(chunk: string) {
    const { view, thread, caption, speaking } = this.state
    const last = thread.at(-1)
    if (view === 'home') {
      if (speaking && last?.kind === 'ai') {
        this.set({ thread: [...thread.slice(0, -1), { ...last, chunks: [...last.chunks, chunk] }] })
      } else {
        this.turn({ kind: 'ai', chunks: [chunk], animate: true })
      }
    } else if (speaking && caption) {
      this.set({ caption: { ...caption, chunks: [...caption.chunks, chunk] } })
    } else {
      this.set({ caption: { id: this.nextId++, chunks: [chunk], animate: true } })
    }
    this.set({ speaking: true, status: status.speaking })
  }

  /** A whole line at once, as a new turn or caption (handy from the console). */
  say(text: string) {
    this.set({ speaking: false })
    this.stream(text)
  }

  /**
   * The live transcript of what the AI is saying. Agora sends the whole text
   * so far for each turn (often more than once); the new part is added as the
   * next piece, so it fades in like a streamed chunk.
   */
  aiText(key: string, text: string) {
    const line = this.aiLine
    if (line?.key !== key) {
      this.say(text)
      const last = this.state.thread.at(-1)
      this.aiLine = { key, text, turnId: this.state.view === 'home' && last ? last.id : null, captionId: this.state.caption?.id ?? null }
      return
    }
    if (text === line.text) return
    const extend = (chunks: string[]) => (text.startsWith(line.text) ? [...chunks, text.slice(line.text.length)] : [text])
    const { thread, caption } = this.state
    if (line.turnId !== null) {
      this.set({ thread: thread.map((t) => (t.id === line.turnId && t.kind === 'ai' ? { ...t, chunks: extend(t.chunks) } : t)) })
    } else if (caption && caption.id === line.captionId) {
      this.set({ caption: { ...caption, chunks: extend(caption.chunks) } })
    }
    line.text = text
  }

  /** What the agent is doing, as Agora reports it: drives the voice bar. */
  agentState(state: string) {
    if (state === 'speaking') {
      this.set({ speaking: true, status: status.speaking })
    } else if (this.state.speaking || this.state.status === status.speaking) {
      // While an experience is being made, the stepper's label stays.
      const making = this.state.generation && this.state.generation.active < 4
      this.set({ speaking: false, status: making ? this.state.status : status.listening })
    }
  }

  /** The learner's words as the speech-to-text hears them, updated as they talk. */
  heardText(key: string, text: string) {
    if (!text.trim() || this.state.view !== 'home') return
    const id = this.learnerTurns.get(key)
    const thread = this.state.thread
    const i = id === undefined ? -1 : thread.findIndex((t) => t.id === id)
    if (i === -1) {
      this.learnerTurns.set(key, this.nextId)
      this.turn({ kind: 'learner', text, animate: true })
    } else {
      this.set({ thread: thread.map((t, j) => (j === i ? { ...t, text } : t)) as Turn[] })
    }
  }

  /** The AI has finished talking and waits for the learner. */
  listen(label = status.listening) {
    this.set({ speaking: false, status: label })
  }

  /** The voice bar's label, e.g. "Opening level 1…". */
  setStatus(label: string) {
    this.set({ status: label })
  }

  /** The learner's saved experiences, as the server has them. */
  setExperiences(experiences: Experience[]) {
    this.saved = experiences
    this.set({ experiences })
  }

  /** What the learner said, as the speech-to-text heard it. */
  heard(text: string) {
    this.turn({ kind: 'learner', text, animate: true })
  }

  startGeneration(generation: Generation) {
    this.set({ generation })
    this.turn({ kind: 'stepper' })
  }

  updateGeneration(patch: Partial<Generation>) {
    if (this.state.generation) this.set({ generation: { ...this.state.generation, ...patch } })
  }

  /** Making the experience failed: the stepper goes away and the AI says so. */
  generationFailed() {
    this.set({ generation: null, thread: this.state.thread.filter((t) => t.kind !== 'stepper') })
  }

  /** A new experience is saved: the side panel / tab bar appears with a NEW badge. */
  experienceReady(experience: Experience) {
    const others = this.state.experiences.filter((e) => e.id !== experience.id)
    this.set({ experiences: [...others, experience], shell: true, badge: true })
  }

  openTab(view: Exclude<View, 'path'>) {
    this.set({
      view,
      caption: null,
      // The side panel (tab bar on mobile) comes in with the Experience tab, also for a learner
      // with saved experiences who hasn't made one this session.
      shell: view === 'experience' || this.state.shell,
      // Seeing the Experience tab clears its NEW badge.
      badge: view === 'experience' ? false : this.state.badge,
    })
  }

  openExperience(id: string) {
    this.set({ view: 'path', openId: id, caption: null, badge: false, shell: true })
  }

  /** Stop ends the voice session (MVP: no resuming). `text` replaces "You stopped the conversation". */
  stop(text?: string) {
    if (this.state.phase !== 'live') return
    this.aiLine = null
    this.set({ phase: 'stopped', speaking: false, caption: null })
    if (this.state.view === 'home') this.turn({ kind: 'stopped', text })
  }

  /** Start over: a brand-new conversation on Home. Saved experiences stay. */
  startOver() {
    this.aiLine = null
    this.learnerTurns.clear()
    this.set({
      phase: 'live',
      view: 'home',
      thread: [],
      generation: null,
      caption: null,
      openId: null,
      speaking: false,
      status: status.listening,
    })
  }

  /** Show a prepared state (the debug panel's screen list). */
  load(state: HomeState) {
    this.set(state)
  }

  reset() {
    this.aiLine = null
    this.learnerTurns.clear()
    this.set(initialState(this.saved))
  }
}

export function useHome(store: HomeStore): HomeState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
