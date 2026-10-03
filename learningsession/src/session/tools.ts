// Function declarations the voice AI is given. Proposed list from
// KNOWLEDGE.md §5. Not confirmed.

export interface ToolParam {
  type: 'string' | 'boolean'
  description: string
}

export interface ToolDeclaration {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, ToolParam>
    required: string[]
  }
}

const stepId: ToolParam = { type: 'string', description: 'Id of the current step.' }

const noParams = { type: 'object' as const, properties: {}, required: [] }

export const toolDeclarations: ToolDeclaration[] = [
  {
    name: 'start_lesson',
    description: 'Start the lesson after the learner taps START. Shows the first step.',
    parameters: noParams,
  },
  {
    name: 'show_step',
    description: 'Show a step by id. Lessons are linear: only the current or the next step.',
    parameters: { type: 'object', properties: { step_id: stepId }, required: ['step_id'] },
  },
  {
    name: 'next_step',
    description: 'Move to the next step. Refused until feedback for the current question is showing.',
    parameters: noParams,
  },
  {
    name: 'select_option',
    description:
      'Mark the option the learner said as selected (multiple choice: option id like "B"; true/false: "true" or "false").',
    parameters: {
      type: 'object',
      properties: { step_id: stepId, option_id: { type: 'string', description: 'Option id.' } },
      required: ['step_id', 'option_id'],
    },
  },
  {
    name: 'set_spoken_answer',
    description: 'Show what the learner said on a speak-your-answer question.',
    parameters: {
      type: 'object',
      properties: { step_id: stepId, text: { type: 'string', description: 'The transcribed answer.' } },
      required: ['step_id', 'text'],
    },
  },
  {
    name: 'submit_answer',
    description: 'Submit the answer once the learner confirms. The app grades it and shows feedback.',
    parameters: { type: 'object', properties: { step_id: stepId }, required: ['step_id'] },
  },
  {
    name: 'finish_lesson',
    description: 'Show the Experience Complete screen after the last step.',
    parameters: noParams,
  },
  {
    name: 'exit_lesson',
    description: 'Return to the lesson path once the goodbye has finished.',
    parameters: noParams,
  },
]

export type ToolName =
  | 'start_lesson'
  | 'show_step'
  | 'next_step'
  | 'select_option'
  | 'set_spoken_answer'
  | 'submit_answer'
  | 'finish_lesson'
  | 'exit_lesson'

export interface ToolCall {
  name: string
  args?: Record<string, unknown>
}
