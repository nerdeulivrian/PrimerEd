import type { Lesson } from '../lesson/types'

export type Phase =
  /** Lesson path / entry screen, waiting for the learner to tap START. */
  | 'entry'
  /** START tapped: the voice AI is awake but hasn't called start_lesson yet. */
  | 'awake'
  | 'lesson'
  | 'complete'

export type Response =
  | { kind: 'choice'; value: string }
  | { kind: 'text'; value: string }

export interface StepResult {
  correct: boolean
}

export type Tier = 'green' | 'orange' | 'red'

export interface Summary {
  score: number
  total: number
  tier: Tier
  missed: string[]
  time: string
}

export interface SessionState {
  lesson: Lesson
  phase: Phase
  stepIndex: number
  /** What's currently on screen as the learner's answer, per step id. */
  responses: Record<string, Response>
  /** Set once submit_answer has graded the step; feedback is showing. */
  results: Record<string, StepResult>
  startedAt: number | null
  summary: Summary | null
}

export function initialState(lesson: Lesson): SessionState {
  return {
    lesson,
    phase: 'entry',
    stepIndex: 0,
    responses: {},
    results: {},
    startedAt: null,
    summary: null,
  }
}

export function tierFor(score: number, total: number): Tier {
  const pct = total === 0 ? 1 : score / total
  if (pct >= 0.8) return 'green'
  if (pct >= 0.5) return 'orange'
  return 'red'
}
