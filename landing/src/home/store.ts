import { useSyncExternalStore } from 'react'
import { solarSystem, status } from './data'
import type { Experience, Generation, HomeState, Turn, View } from './types'

export function initialState(): HomeState {
  return {
    phase: 'welcome',
    view: 'home',
    thread: [],
    generation: null,
    status: status.listening,
    speaking: false,
    caption: null,
    experiences: [solarSystem],
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
  private state = initialState()
  private listeners = new Set<() => void>()
  private nextId = 1
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

  /** The AI has finished talking and waits for the learner. */
  listen(label = status.listening) {
    this.set({ speaking: false, status: label })
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

  /** A new experience is saved: the side panel / tab bar appears with a NEW badge. */
  experienceReady(experience: Experience) {
    const others = this.state.experiences.filter((e) => e.id !== experience.id)
    this.set({ experiences: [...others, experience], shell: true, badge: true })
  }

  openTab(view: Exclude<View, 'path'>) {
    this.set({
      view,
      caption: null,
      // Seeing the Experience tab clears its NEW badge.
      badge: view === 'experience' ? false : this.state.badge,
    })
  }

  openExperience(id: string) {
    this.set({ view: 'path', openId: id, caption: null, badge: false })
  }

  /** Stop ends the voice session (MVP: no resuming). */
  stop() {
    if (this.state.phase !== 'live') return
    this.set({ phase: 'stopped', speaking: false, caption: null })
    if (this.state.view === 'home') this.turn({ kind: 'stopped' })
  }

  /** Start over: a brand-new conversation on Home. Saved experiences stay. */
  startOver() {
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
    this.set(initialState())
  }
}

export function useHome(store: HomeStore): HomeState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
