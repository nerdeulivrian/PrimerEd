import { normalizeAnswer } from '../lesson/normalize'
import { isQuestion, type Lesson, type QuestionStep, type Step } from '../lesson/types'
import { initialState, tierFor, type Response, type SessionState } from './state'
import type { ToolCall } from './tools'

export type ToolResult = Record<string, unknown>

export interface CallOutcome {
  state: SessionState
  /** What the app sends back to the voice AI as the function result. */
  result: ToolResult
  ok: boolean
}

class CallError extends Error {}

function fail(message: string): never {
  throw new CallError(message)
}

/** A step as the voice AI sees it: everything except the answer. */
export function stepForAI(step: Step): Record<string, unknown> {
  const { answer: _answer, ...rest } = step as Step & { answer?: unknown }
  void _answer
  if (step.type === 'true_false') {
    return { ...rest, options: [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }] }
  }
  return rest
}

/** The lesson payload with every answer stripped out. */
export function lessonForAI(lesson: Lesson) {
  return { ...lesson, steps: lesson.steps.map(stepForAI) }
}

export function currentStep(state: SessionState): Step {
  return state.lesson.steps[state.stepIndex]
}

export function isStepDone(state: SessionState, step: Step): boolean {
  return step.type === 'slide' || Boolean(state.results[step.id])
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function correctAnswerText(step: QuestionStep): unknown {
  switch (step.type) {
    case 'multiple_choice': {
      const option = step.options.find((o) => o.id === step.answer)
      return { id: step.answer, text: option?.text }
    }
    case 'true_false':
      return step.answer
    case 'speak_answer':
      return step.answer
  }
}

export function grade(step: QuestionStep, response: Response | undefined): boolean {
  if (!response) return false
  switch (step.type) {
    case 'multiple_choice':
      return response.kind === 'choice' && response.value === step.answer
    case 'true_false':
      return response.kind === 'choice' && response.value === String(step.answer)
    case 'speak_answer':
      return response.kind === 'text' && normalizeAnswer(response.value) === step.answer
  }
}

function str(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value === 'boolean') return String(value)
  if (typeof value !== 'string' || value === '') fail(`Missing argument "${key}".`)
  return value
}

function requireLesson(state: SessionState) {
  if (state.phase === 'entry') fail('The learner has not tapped START yet.')
  if (state.phase === 'awake') fail('The lesson has not started. Call start_lesson first.')
  if (state.phase === 'complete') fail('The lesson is complete. Call exit_lesson.')
}

/** The step a call refers to must be the one on screen. */
function requireCurrent(state: SessionState, stepId: string): Step {
  requireLesson(state)
  const step = currentStep(state)
  if (step.id !== stepId) fail(`Step "${stepId}" is not on screen; the current step is "${step.id}".`)
  return step
}

function requireAnswerable(state: SessionState, step: Step) {
  if (state.results[step.id]) fail(`Step "${step.id}" has already been submitted.`)
}

function stepPayload(state: SessionState, index: number): ToolResult {
  const step = state.lesson.steps[index]
  return { step: stepForAI(step), position: index + 1, total: state.lesson.steps.length }
}

function moveTo(state: SessionState, index: number): SessionState {
  return { ...state, stepIndex: index }
}

function advanceFrom(state: SessionState, targetIndex: number): SessionState {
  const step = currentStep(state)
  if (!isStepDone(state, step)) {
    fail(`Feedback for "${step.id}" hasn't been shown yet. Call submit_answer first.`)
  }
  if (targetIndex >= state.lesson.steps.length) fail('This is the last step. Call finish_lesson.')
  return moveTo(state, targetIndex)
}

function run(state: SessionState, call: ToolCall): { state: SessionState; result: ToolResult } {
  const args = call.args ?? {}

  switch (call.name) {
    case 'start_lesson': {
      if (state.phase === 'entry') fail('The learner has not tapped START yet.')
      if (state.phase !== 'awake') fail('The lesson has already started.')
      const next = moveTo({ ...state, phase: 'lesson', startedAt: Date.now() }, 0)
      const { title, mode, intro_narration, learning_objectives } = state.lesson.lesson
      return {
        state: next,
        result: {
          lesson: { title, mode, intro_narration, learning_objectives },
          steps: state.lesson.steps.map(stepForAI),
          current: stepPayload(next, 0),
        },
      }
    }

    case 'show_step': {
      requireLesson(state)
      const stepId = str(args, 'step_id')
      const index = state.lesson.steps.findIndex((s) => s.id === stepId)
      if (index === -1) fail(`No step with id "${stepId}".`)
      if (index < state.stepIndex) fail('Lessons are linear: you cannot go back to an earlier step.')
      if (index > state.stepIndex + 1) fail(`Step "${stepId}" is not next; the next step is "${state.lesson.steps[state.stepIndex + 1]?.id}".`)
      const next = index === state.stepIndex ? state : advanceFrom(state, index)
      return { state: next, result: stepPayload(next, index) }
    }

    case 'next_step': {
      requireLesson(state)
      const next = advanceFrom(state, state.stepIndex + 1)
      return { state: next, result: stepPayload(next, next.stepIndex) }
    }

    case 'select_option': {
      const step = requireCurrent(state, str(args, 'step_id'))
      requireAnswerable(state, step)
      const optionId = str(args, 'option_id')
      if (step.type === 'multiple_choice') {
        const option = step.options.find((o) => o.id.toLowerCase() === optionId.toLowerCase())
        if (!option) fail(`No option "${optionId}". Options: ${step.options.map((o) => o.id).join(', ')}.`)
        return {
          state: { ...state, responses: { ...state.responses, [step.id]: { kind: 'choice', value: option.id } } },
          result: { ok: true, selected: { id: option.id, text: option.text } },
        }
      }
      if (step.type === 'true_false') {
        const value = optionId.toLowerCase()
        if (value !== 'true' && value !== 'false') fail('Option must be "true" or "false".')
        return {
          state: { ...state, responses: { ...state.responses, [step.id]: { kind: 'choice', value } } },
          result: { ok: true, selected: { id: value, text: value === 'true' ? 'True' : 'False' } },
        }
      }
      return fail(`select_option doesn't apply to a ${step.type} step.`)
    }

    case 'set_spoken_answer': {
      const step = requireCurrent(state, str(args, 'step_id'))
      if (step.type !== 'speak_answer') fail(`set_spoken_answer doesn't apply to a ${step.type} step.`)
      requireAnswerable(state, step)
      const text = typeof args.text === 'string' ? args.text : fail('Missing argument "text".')
      const normalized = normalizeAnswer(text)
      return {
        state: { ...state, responses: { ...state.responses, [step.id]: { kind: 'text', value: normalized } } },
        result: { ok: true, normalized },
      }
    }

    case 'submit_answer': {
      const step = requireCurrent(state, str(args, 'step_id'))
      if (!isQuestion(step)) fail('Slides have nothing to submit.')
      requireAnswerable(state, step)
      const response = state.responses[step.id]
      if (!response || (response.kind === 'text' && !response.value)) fail('The learner has not given an answer yet.')
      const correct = grade(step, response)
      return {
        state: { ...state, results: { ...state.results, [step.id]: { correct } } },
        result: {
          correct,
          correct_answer: correctAnswerText(step),
          feedback: correct ? step.feedback.correct : step.feedback.incorrect,
        },
      }
    }

    case 'finish_lesson': {
      requireLesson(state)
      const last = state.lesson.steps.length - 1
      if (state.stepIndex !== last) fail(`There are steps left; the current step is "${currentStep(state).id}".`)
      if (!isStepDone(state, currentStep(state))) fail('Show feedback for the last question before finishing.')
      const questions = state.lesson.steps.filter(isQuestion)
      const missed = questions.filter((q) => !state.results[q.id]?.correct).map((q) => q.id)
      const score = questions.length - missed.length
      const summary = {
        score,
        total: questions.length,
        tier: tierFor(score, questions.length),
        missed,
        time: formatDuration(Date.now() - (state.startedAt ?? Date.now())),
      }
      return { state: { ...state, phase: 'complete', summary }, result: summary }
    }

    case 'exit_lesson': {
      if (state.phase !== 'complete') fail('exit_lesson is only available on the Experience Complete screen.')
      return { state: initialState(state.lesson), result: { ok: true } }
    }

    default:
      return fail(`Unknown function "${call.name}".`)
  }
}

/** Carries out one function call from the voice AI. Never throws. */
export function executeCall(state: SessionState, call: ToolCall): CallOutcome {
  try {
    const out = run(state, call)
    return { ...out, ok: true }
  } catch (err) {
    if (err instanceof CallError) return { state, result: { error: err.message }, ok: false }
    throw err
  }
}
