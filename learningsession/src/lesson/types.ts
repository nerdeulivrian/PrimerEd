// Lesson JSON, following the draft shape in KNOWLEDGE.md §5.
// Field names are not final.

export type LessonMode = 'practice' | 'quiz'

export interface LessonInfo {
  id: string
  title: string
  mode: LessonMode
  intro_narration?: string
  outro_narration?: string
  learning_objectives: string[]
}

export interface Feedback {
  correct: string
  incorrect: string
}

interface StepBase {
  id: string
  narration?: string
  talking_points?: string[]
}

export interface SlideStep extends StepBase {
  type: 'slide'
  image: { url: string; alt: string; prompt?: string }
}

export interface Option {
  id: string
  text: string
}

export interface MultipleChoiceStep extends StepBase {
  type: 'multiple_choice'
  question: string
  options: Option[]
  answer: string
  feedback: Feedback
}

export interface TrueFalseStep extends StepBase {
  type: 'true_false'
  question: string
  answer: boolean
  feedback: Feedback
}

export interface SpeakAnswerStep extends StepBase {
  type: 'speak_answer'
  question: string
  /** Stored already normalized, max 14 characters. */
  answer: string
  feedback: Feedback
}

export type QuestionStep = MultipleChoiceStep | TrueFalseStep | SpeakAnswerStep
export type Step = SlideStep | QuestionStep
export type StepType = Step['type']

export interface Lesson {
  schema_version: number
  lesson: LessonInfo
  steps: Step[]
}

export function isQuestion(step: Step): step is QuestionStep {
  return step.type !== 'slide'
}
