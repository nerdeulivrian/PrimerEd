import type { Lesson, Step } from './types.ts'

type Stripped<T> = T extends { answer: unknown } ? Omit<T, 'answer'> : T

/** What the voice AI gets: the lesson without answers, so it can't hint at or leak them. */
export function stripAnswers(lesson: Lesson): Omit<Lesson, 'steps'> & { steps: Stripped<Step>[] } {
  return {
    ...lesson,
    steps: lesson.steps.map((step) => {
      if (!('answer' in step)) return step
      const { answer: _answer, ...rest } = step
      return rest
    }),
  }
}
