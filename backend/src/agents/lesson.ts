import type { Tool } from '../agora.ts'
import { completeLevel, type LevelRow } from '../db.ts'
import { stripAnswers } from '../lesson/strip.ts'
import { closeSession, getSession, openSession, relay, type Session } from '../sessions.ts'

/**
 * The browser holds each result until the tutor's voice has caught up with the
 * call (Gemini makes its audio faster than it plays), so the screen changes when
 * the voice gets there. That can take a while after a long narration.
 */
const CALL_TIMEOUT_MS = 35_000

type LessonTool = Tool & { engineName: string }

const withTimeout = (tools: LessonTool[]) => tools.map((tool) => ({ ...tool, timeoutMs: CALL_TIMEOUT_MS + 5000 }))

const stepId = { type: 'string' as const, description: 'Id of the current step.' }

/**
 * The lesson functions from learningsession/src/session/tools.ts. Agora tool
 * names can only be letters and numbers, so Gemini sees camelCase names and
 * the browser gets the engine's snake_case ones.
 */
const lessonTools = withTimeout([
  {
    name: 'startLesson',
    engineName: 'start_lesson',
    description: 'Start the lesson once the learner is ready. Shows the first step.',
    parameters: {},
    required: [],
  },
  {
    name: 'showStep',
    engineName: 'show_step',
    description: 'Show a step by id. Lessons are linear: only the current or the next step.',
    parameters: { step_id: stepId },
    required: ['step_id'],
  },
  {
    name: 'nextStep',
    engineName: 'next_step',
    description: 'Move to the next step. Refused until feedback for the current question is showing.',
    parameters: {},
    required: [],
  },
  {
    name: 'selectOption',
    engineName: 'select_option',
    description:
      'Mark the option the learner said as selected (multiple choice: option id like "B"; true/false: "true" or "false").',
    parameters: { step_id: stepId, option_id: { type: 'string', description: 'Option id.' } },
    required: ['step_id', 'option_id'],
  },
  {
    name: 'setSpokenAnswer',
    engineName: 'set_spoken_answer',
    description: 'Show what the learner said on a speak-your-answer question.',
    parameters: { step_id: stepId, text: { type: 'string', description: 'The answer, as the learner said it.' } },
    required: ['step_id', 'text'],
  },
  {
    name: 'submitAnswer',
    engineName: 'submit_answer',
    description: 'Submit the answer once the learner confirms. The app grades it and shows feedback.',
    parameters: { step_id: stepId },
    required: ['step_id'],
  },
  {
    name: 'finishLesson',
    engineName: 'finish_lesson',
    description: 'Show the Experience Complete screen after the last step.',
    parameters: {},
    required: [],
  },
  {
    name: 'exitLesson',
    engineName: 'exit_lesson',
    description: 'Leave the lesson once your goodbye has finished.',
    parameters: {},
    required: [],
  },
])

export function lessonAgent(level: LevelRow) {
  const instructions = `You are PrimerEd's voice tutor, teaching one lesson. The learner uses the app only by talking with you, so you move through the lesson with your functions. Never mention functions, tools or ids.

How the lesson goes:
- You have just asked if they're ready to begin. Wait for their answer: call startLesson only once they say yes, then teach each step in order.
- Slide: say its narration in your own natural words, using the talking points. Then call nextStep.
- Question: read the question (and the options with their letters). When they answer, call selectOption or setSpokenAnswer, then ask if they're sure. If yes, call submitAnswer and read out the result and its feedback kindly. If not, let them change it. Then call nextStep.
- You never know the answers: the app grades them. Don't guess or hint.
- The learner can interrupt or ask about anything at any time. Answer briefly from the lesson, then ask "Ready to move on?" before continuing.
- After the last step, call finishLesson and read out their score warmly. Then say the outro, a short goodbye, and call exitLesson.
Keep every turn short: two or three spoken sentences.

The lesson (answers removed):
${JSON.stringify(stripAnswers(level.lesson))}`
  const greeting = `Welcome to level ${level.position + 1}, ${level.title}. Ready to begin?`
  return { instructions, greeting, tools: lessonTools }
}

/**
 * Lesson tutors started early, by launch code. openLevel starts one while
 * landing is still saying goodbye, so the lesson page joins a tutor that's
 * already up. Its greeting waits until the learner joins the channel.
 */
const early = new Map<string, { at: number; session: Promise<Session> }>()
/** Agora stops an agent that's been alone in its channel for 30 s (idle_timeout); stay well inside that. */
const EARLY_MAX_AGE_MS = 20_000

export function startLessonEarly(code: string, learnerId: string, level: LevelRow) {
  const session = openSession('lesson', learnerId, lessonAgent(level), level.id)
  session.catch((err) => console.warn('early lesson tutor failed:', err.message))
  early.set(code, { at: Date.now(), session })
  // Not picked up in time: stop it.
  setTimeout(() => {
    if (early.get(code)?.session !== session) return
    early.delete(code)
    session.then(closeSession, () => {})
  }, EARLY_MAX_AGE_MS)
}

/** The tutor for a launch code: the one started early if it's still fresh, otherwise a new one. */
export async function lessonSession(code: string, learnerId: string, level: LevelRow): Promise<Session> {
  const started = early.get(code)
  early.delete(code)
  if (started && Date.now() - started.at < EARLY_MAX_AGE_MS) {
    const session = await started.session.catch(() => null)
    if (session && getSession(session.id)) return session
  }
  return openSession('lesson', learnerId, lessonAgent(level), level.id)
}

export async function handleLessonTool(session: Session, name: string, args: Record<string, string | undefined>) {
  const tool = lessonTools.find((t) => t.name === name)
  if (!tool) return { success: false, error: `Unknown function ${name}.` }
  const callArgs = Object.fromEntries(Object.keys(tool.parameters).map((k) => [k, args[k]]))
  const result = (await relay(session, tool.engineName, callArgs, CALL_TIMEOUT_MS)) as { score?: number; total?: number } | undefined
  if (tool.engineName === 'finish_lesson' && session.levelId && typeof result?.score === 'number' && typeof result.total === 'number') {
    await completeLevel(session.levelId, result.score, result.total)
  }
  return result
}
