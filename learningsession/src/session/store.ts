import { useSyncExternalStore } from 'react'
import type { Lesson } from '../lesson/types'
import { executeCall, type ToolResult } from './engine'
import { initialState, type SessionState } from './state'
import type { ToolCall } from './tools'

export type LogEntry =
  | { id: number; at: number; kind: 'call'; call: ToolCall; result: ToolResult; ok: boolean }
  | { id: number; at: number; kind: 'event'; text: string }

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
type NewLogEntry = DistributiveOmit<LogEntry, 'id' | 'at'>

/** A visual-only button the voice AI just "pressed". */
export type Pressed = 'proceed' | 'exit'

/** When the screen moves on: just after the 120ms press (animate-press) releases. */
export const PRESS_MS = 150

export interface Snapshot {
  /** The real session state; function calls run against this. */
  session: SessionState
  /** What the player shows. Lags `session` while a button press plays. */
  screen: SessionState
  pressed: Pressed | null
  log: LogEntry[]
}

/** Which on-screen button a successful call presses, if any. */
function pressFor(before: SessionState, after: SessionState): Pressed | null {
  if (before.phase === 'complete' && after.phase === 'entry') return 'exit'
  if (before.phase !== 'lesson') return null
  const step = before.lesson.steps[before.stepIndex]
  const feedbackShowing = step.type !== 'slide' && Boolean(before.results[step.id])
  const leaving = after.phase === 'complete' || after.stepIndex !== before.stepIndex
  return feedbackShowing && leaving ? 'proceed' : null
}

/**
 * Holds the lesson session. Today the simulator drives it; later the voice
 * AI's function calls go through the same `call()`.
 */
export class SessionStore {
  private snapshot: Snapshot
  private listeners = new Set<() => void>()
  private nextId = 1
  private pressTimer: ReturnType<typeof setTimeout> | null = null

  constructor(lesson: Lesson) {
    const session = initialState(lesson)
    this.snapshot = { session, screen: session, pressed: null, log: [] }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.snapshot

  private emit(snapshot: Snapshot) {
    this.snapshot = snapshot
    this.listeners.forEach((l) => l())
  }

  private set(session: SessionState, entry?: NewLogEntry, pressed: Pressed | null = null) {
    const log = entry
      ? [...this.snapshot.log, { ...entry, id: this.nextId++, at: Date.now() } as LogEntry]
      : this.snapshot.log
    if (pressed && !this.pressTimer) {
      // Keep showing the old screen while the button press plays, then catch up.
      this.emit({ ...this.snapshot, session, pressed, log })
      this.pressTimer = setTimeout(() => {
        this.pressTimer = null
        this.emit({ ...this.snapshot, screen: this.snapshot.session, pressed: null })
      }, PRESS_MS)
      return
    }
    // During a press the screen catches up when the timer fires.
    const screen = this.pressTimer ? this.snapshot.screen : session
    this.emit({ ...this.snapshot, session, screen, log })
  }

  private cancelPress() {
    if (this.pressTimer) clearTimeout(this.pressTimer)
    this.pressTimer = null
    this.snapshot = { ...this.snapshot, pressed: null }
  }

  call(call: ToolCall): ToolResult {
    const before = this.snapshot.session
    const outcome = executeCall(before, call)
    const pressed = outcome.ok ? pressFor(before, outcome.state) : null
    this.set(outcome.state, { kind: 'call', call, result: outcome.result, ok: outcome.ok }, pressed)
    return outcome.result
  }

  /** The one real tap: START on the entry screen wakes the voice AI. */
  tapStart() {
    if (this.snapshot.session.phase !== 'entry') return
    this.set({ ...this.snapshot.session, phase: 'awake' }, { kind: 'event', text: 'Learner tapped START: voice AI session opens' })
  }

  /** Swap in a new lesson payload and start over. */
  load(lesson: Lesson) {
    this.cancelPress()
    this.set(initialState(lesson), { kind: 'event', text: `Loaded lesson "${lesson.lesson.title}"` })
  }

  reset() {
    this.cancelPress()
    this.set(initialState(this.snapshot.session.lesson), { kind: 'event', text: 'Session reset' })
  }

  clearLog() {
    this.emit({ ...this.snapshot, log: [] })
  }
}

export function useSession(store: SessionStore): Snapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
