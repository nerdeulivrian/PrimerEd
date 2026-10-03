import { useSyncExternalStore } from 'react'
import { solarSystem, status } from './data'
import type { Experience, Generation, HomeState, Turn, View } from './types'

/** How long one spoken word takes at 1× speed (about 200 words a minute). */
export const WORD_MS = 300

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
  /** Playback speed of the demo; spoken words reveal faster too. */
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

  get wordMs() {
    return WORD_MS / this.speed
  }

  /** The one real tap: the orb on the welcome screen opens the voice session. */
  tapStart() {
    if (this.state.phase !== 'welcome') return
    this.set({ phase: 'live', view: 'home', status: status.listening })
  }

  /** The AI speaks. In the conversation it's a turn; elsewhere a floating caption. */
  say(text: string) {
    if (this.state.view === 'home') {
      this.turn({ kind: 'ai', text, wordMs: this.wordMs })
      this.set({ speaking: true, status: status.speaking })
    } else {
      this.set({ caption: { id: this.nextId++, text, wordMs: this.wordMs }, speaking: true, status: status.speaking })
    }
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
