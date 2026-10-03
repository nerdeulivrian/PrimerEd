import { randomBytes } from 'node:crypto'
import type { Tool } from '../agora.ts'
import { config } from '../config.ts'
import { createLaunch, getLevel, listExperiences, markOpened, saveExperience, type ExperienceView } from '../db.ts'
import { createExperience } from '../generate/pipeline.ts'
import { startLessonEarly } from './lesson.ts'
import { push, relay, type Session } from '../sessions.ts'

/** The whole experience must be made inside Agora's 100 s tool timeout. */
const GENERATION_DEADLINE_MS = 90_000

export const homeTools: Tool[] = [
  {
    name: 'createExperience',
    description:
      'Make a new learning experience (5 levels of lessons with pictures and questions) once the learner has agreed to the plan. Takes up to a minute; the screen shows progress meanwhile. Returns the new experience.',
    parameters: {
      topic: { type: 'string', description: 'What to learn, e.g. "algebra".' },
      learnerLevel: { type: 'string', description: 'How much they know already, in a few words.' },
      focus: { type: 'string', description: 'What to focus on, e.g. "from variables to simple equations".' },
    },
    required: ['topic', 'learnerLevel', 'focus'],
    timeoutMs: 100_000,
  },
  {
    name: 'openTab',
    description: 'Switch the screen to a tab: "home" (this conversation) or "experience" (the saved experiences).',
    parameters: { tab: { type: 'string', enum: ['home', 'experience'], description: 'Which tab.' } },
    required: ['tab'],
  },
  {
    name: 'openExperience',
    description:
      "Open a saved experience: shows the Experience tab briefly, then its level path. Don't call openTab before or after it. Returns its levels and which one is next.",
    parameters: { experience: { type: 'string', description: 'The experience id (or its exact title).' } },
    required: ['experience'],
  },
  {
    name: 'openLevel',
    description:
      'Start a level when the learner asks (e.g. "let\'s begin level 1"). Only the next level or a finished one can be opened. The lesson opens once you finish your next sentence.',
    parameters: {
      experience: { type: 'string', description: 'The experience id (or its exact title).' },
      level: { type: 'string', description: 'The level number, 1 to 5.' },
    },
    required: ['experience', 'level'],
  },
]

function describe(e: ExperienceView) {
  const next = e.done < e.levels.length ? `level ${e.done + 1} is next` : 'all levels done'
  return `- id ${e.id}: "${e.title}" (${e.subject}), ${next}. Levels: ${e.levels.map((l, i) => `${i + 1}. ${l.title}`).join('; ')}`
}

export async function homeAgent(learnerId: string) {
  const experiences = await listExperiences(learnerId)
  const instructions = `You are the voice of PrimerEd, a learning app that people use only by talking with you. There is nothing to tap or type, so you do everything on screen with your functions.
Keep every reply short: one to three spoken sentences, warm and natural. Ask one question at a time. Never mention functions, tools or ids.

To make a new learning experience:
1. Find out what they want to learn, how much they know already, and anything they want to focus on. Don't ask more than needed.
2. Sum up the plan in one sentence and ask if it sounds good.
3. When they agree, say one short line like "Perfect, I'll put your lessons together now. It'll only take a moment." Then call createExperience.
4. When it returns, say it's ready by its title and ask "Do you wanna hop into it?"
5. If they say yes, call openExperience (it shows the Experience tab, then the experience's level path). When it returns, say "Here's your path for <title>" and ask if they're ready to start level 1 by its name.

When they ask to begin a level (e.g. "let's begin level 1"), call openLevel, then say one short line like "Let's go!" and stop talking. If a level is locked, say which level is next.
They can also go back to a saved experience at any time ("let's go back to the solar system"): call openExperience. Use openTab only when they ask for a tab itself.
If something fails, say so simply and offer to try again. Don't invent experiences.

The learner's saved experiences:
${experiences.length ? experiences.map(describe).join('\n') : 'None yet.'}`
  const greeting = experiences.length
    ? "Hi there! Do you want to make a new learning experience today, or pick up one you've done before?"
    : 'Hi there! What would you like to learn today?'
  return { instructions, greeting, tools: homeTools }
}

async function findExperience(learnerId: string, ref: string) {
  const all = await listExperiences(learnerId)
  const key = ref.trim().toLowerCase()
  return all.find((e) => e.id === ref.trim()) ?? all.find((e) => e.title.toLowerCase() === key) ?? null
}

type Args = Record<string, string | undefined>

export async function handleHomeTool(session: Session, name: string, args: Args): Promise<unknown> {
  switch (name) {
    case 'createExperience': {
      if (session.generating) return { success: false, error: 'An experience is already being made.' }
      session.generating = true
      try {
        const request = { topic: args.topic ?? '', learnerLevel: args.learnerLevel ?? '', focus: args.focus ?? '' }
        const made = await Promise.race([
          createExperience(request, (progress) => push(session, 'generation', progress)),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('It took too long')), GENERATION_DEADLINE_MS)),
        ])
        const id = await saveExperience(session.learnerId, made)
        const experience = (await listExperiences(session.learnerId)).find((e) => e.id === id)
        push(session, 'generation', { active: 4 })
        push(session, 'experienceReady', experience)
        return {
          success: true,
          experience: { id, title: made.title, levels: made.levels.map((l, i) => `${i + 1}. ${l.title}`) },
        }
      } catch (err) {
        console.error('createExperience failed:', err)
        push(session, 'generationFailed', { message: (err as Error).message })
        return { success: false, error: "The experience couldn't be made this time." }
      } finally {
        session.generating = false
      }
    }

    case 'openTab': {
      const tab = args.tab === 'experience' ? 'experience' : 'home'
      return relay(session, 'openTab', { tab })
    }

    case 'openExperience': {
      const experience = await findExperience(session.learnerId, args.experience ?? '')
      if (!experience) return { success: false, error: 'There is no saved experience by that name.' }
      await markOpened(session.learnerId, experience.id)
      const result = await relay(session, 'openExperience', { experienceId: experience.id })
      return {
        ...(result as object),
        title: experience.title,
        levels: experience.levels.map((l, i) => ({
          number: i + 1,
          title: l.title,
          state: i < experience.done ? 'done' : i === experience.done ? 'next' : 'locked',
        })),
      }
    }

    case 'openLevel': {
      const experience = await findExperience(session.learnerId, args.experience ?? '')
      if (!experience) return { success: false, error: 'There is no saved experience by that name.' }
      const number = Number.parseInt(args.level ?? '', 10)
      if (!(number >= 1 && number <= experience.levels.length)) {
        return { success: false, error: `Levels go from 1 to ${experience.levels.length}.` }
      }
      if (number > experience.done + 1) {
        return { success: false, error: `Level ${number} is locked. Level ${experience.done + 1} is next.` }
      }
      const level = await getLevel(session.learnerId, experience.id, number - 1)
      if (!level) return { success: false, error: 'That level is missing.' }
      const code = randomBytes(18).toString('base64url')
      await createLaunch(session.learnerId, level.id, code)
      startLessonEarly(code, session.learnerId, level)
      const url = `${config.lessonUrl}/?launch=${code}`
      const result = await relay(session, 'openLevel', { experienceId: experience.id, level: number, url })
      return { ...(result as object), level: number, title: level.title }
    }
  }
  return { success: false, error: `Unknown function ${name}.` }
}
