import { normalizeAnswer, SPOKEN_ANSWER_MAX } from './normalize'
import type { Lesson } from './types'

/** Authoring-time checks on a lesson payload. Returns a list of problems. */
export function validateLesson(input: unknown): string[] {
  const errors: string[] = []
  const lesson = input as Partial<Lesson> | null

  if (!lesson || typeof lesson !== 'object') return ['Lesson must be a JSON object.']
  if (!lesson.lesson?.title) errors.push('lesson.title is missing.')
  if (!Array.isArray(lesson.lesson?.learning_objectives)) {
    errors.push('lesson.learning_objectives must be an array.')
  }
  if (!Array.isArray(lesson.steps) || lesson.steps.length === 0) {
    errors.push('steps must be a non-empty array.')
    return errors
  }

  const ids = new Set<string>()
  lesson.steps.forEach((step, i) => {
    const at = `steps[${i}] (${step?.id ?? 'no id'})`
    if (!step?.id) errors.push(`${at}: id is missing.`)
    else if (ids.has(step.id)) errors.push(`${at}: duplicate id.`)
    else ids.add(step.id)

    switch (step?.type) {
      case 'slide':
        if (!step.image?.url) errors.push(`${at}: image.url is missing.`)
        break
      case 'multiple_choice':
        if (!step.options?.length) errors.push(`${at}: options are missing.`)
        else if (!step.options.some((o) => o.id === step.answer)) {
          errors.push(`${at}: answer "${step.answer}" is not one of the option ids.`)
        }
        break
      case 'true_false':
        if (typeof step.answer !== 'boolean') errors.push(`${at}: answer must be true or false.`)
        break
      case 'speak_answer':
        if (typeof step.answer !== 'string' || !step.answer) {
          errors.push(`${at}: answer is missing.`)
        } else if (normalizeAnswer(step.answer) !== step.answer) {
          errors.push(`${at}: answer "${step.answer}" is not normalized (expected "${normalizeAnswer(step.answer)}").`)
        } else if (step.answer.length > SPOKEN_ANSWER_MAX) {
          errors.push(`${at}: answer is longer than ${SPOKEN_ANSWER_MAX} characters.`)
        }
        break
      default:
        errors.push(`${at}: unknown type "${(step as { type?: string })?.type}".`)
    }

    if (step && step.type !== 'slide') {
      if (!step.question) errors.push(`${at}: question is missing.`)
      if (!step.feedback?.correct || !step.feedback?.incorrect) {
        errors.push(`${at}: feedback.correct and feedback.incorrect are required.`)
      }
    }
  })

  return errors
}
