import { isQuestion, type QuestionStep } from '../lesson/types'
import { currentStep, isStepDone } from '../session/engine'
import type { SessionState } from '../session/state'
import type { ToolCall } from '../session/tools'

/** Which questions the scripted learner gets right. */
export type DemoStrategy = 'correct' | 'mixed' | 'wrong'

export const demoStrategies: { id: DemoStrategy; label: string }[] = [
  { id: 'correct', label: 'All correct (green)' },
  { id: 'mixed', label: 'Mixed (orange)' },
  { id: 'wrong', label: 'Mostly wrong (red)' },
]

function answersCorrectly(strategy: DemoStrategy, questionIndex: number) {
  if (strategy === 'correct') return true
  if (strategy === 'wrong') return questionIndex === 0
  return questionIndex % 2 === 0
}

function answerCall(step: QuestionStep, correct: boolean): ToolCall {
  switch (step.type) {
    case 'multiple_choice': {
      const wrong = step.options.find((o) => o.id !== step.answer)?.id ?? step.answer
      return { name: 'select_option', args: { step_id: step.id, option_id: correct ? step.answer : wrong } }
    }
    case 'true_false':
      return { name: 'select_option', args: { step_id: step.id, option_id: String(correct ? step.answer : !step.answer) } }
    case 'speak_answer':
      return { name: 'set_spoken_answer', args: { step_id: step.id, text: correct ? step.answer : 'saturn' } }
  }
}

export type DemoAction = { kind: 'tap' } | { kind: 'call'; call: ToolCall } | { kind: 'done' }

/**
 * Picks the voice AI's next move from the current state, so the demo can be
 * started at any point in a lesson. `answered` tracks which steps the scripted
 * learner has already given an answer for.
 */
export function nextDemoAction(session: SessionState, strategy: DemoStrategy, answered: Set<string>): DemoAction {
  switch (session.phase) {
    case 'entry':
      return { kind: 'tap' }
    case 'awake':
      return { kind: 'call', call: { name: 'start_lesson' } }
    case 'complete':
      return { kind: 'done' }
  }

  const step = currentStep(session)
  if (isQuestion(step) && !session.results[step.id]) {
    if (!answered.has(step.id)) {
      answered.add(step.id)
      const questionIndex = session.lesson.steps.filter(isQuestion).indexOf(step)
      return { kind: 'call', call: answerCall(step, answersCorrectly(strategy, questionIndex)) }
    }
    return { kind: 'call', call: { name: 'submit_answer', args: { step_id: step.id } } }
  }

  if (isStepDone(session, step)) {
    const last = session.stepIndex === session.lesson.steps.length - 1
    return { kind: 'call', call: { name: last ? 'finish_lesson' : 'next_step' } }
  }
  return { kind: 'done' }
}
