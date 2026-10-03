import { randomUUID } from 'node:crypto'
import { config } from '../config.ts'
import type { NewExperience } from '../db.ts'
import { isStorableAnswer, normalizeAnswer, SPOKEN_ANSWER_MAX } from '../lesson/normalize.ts'
import type { Lesson, QuestionStep, SlideStep, Step } from '../lesson/types.ts'
import { saveImage } from '../storage.ts'
import { generateImage, generateJson } from './gemini.ts'
import { imagePrompt } from './imagePrompt.ts'
import { LEVELS, LevelQuestions, LevelSlides, Outline, QUESTIONS_PER_LEVEL, type ImageSpec } from './schemas.ts'

/** Shown on a slide whose picture couldn't be drawn. */
const PLACEHOLDER = `http://localhost:${config.port}/placeholder.svg`

/** Level ranks, easiest first. Levels 2–4's names aren't confirmed yet. */
const RANKS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Master']

export interface Request {
  topic: string
  /** How much the learner knows already, in their words. */
  learnerLevel: string
  /** Anything they want to focus on. */
  focus: string
}

/** Drives the stepper in the thread (matches landing's `Generation`). */
export interface Progress {
  title: string
  focus: string
  /** The step in progress: 0 Crafting, 1 Visualizing, 2 Creating Assessment, 3 saving, 4 done. */
  active: number
  lessons: number
  pictures: number
  picturesDone: number
  questions: number
}

const WRITER = `You write short, clear, voice-first lessons for PrimerEd, an app a learner uses only by talking with a tutor.
- The tutor reads the narration out loud, so write the way people speak: short sentences, plain words, no lists, no markdown, no symbols or formulas spelled with signs (say "x plus three equals five").
- Pitch everything at the learner's level and build up one idea at a time.
- Be accurate. Prefer simple, true statements over impressive ones.
- Pictures can't contain any text or numbers, so describe pictures that show ideas with objects, shapes and colour.`

async function retry<T>(attempts: number, run: () => Promise<T>): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await run()
    } catch (err) {
      if (i >= attempts) throw err
      console.warn(`retrying after: ${(err as Error).message}`)
    }
  }
}

/** Runs `tasks` with at most `limit` at a time. */
async function pool<T>(limit: number, tasks: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let next = 0
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'lesson'

/** Checks a question the model wrote and turns it into a lesson step, or null if it's unusable. */
function toQuestion(q: LevelQuestions['questions'][number], id: string): QuestionStep | null {
  const base = { id, question: q.question.trim(), narration: q.narration.trim(), feedback: q.feedback }
  if (!base.question) return null
  switch (q.type) {
    case 'multiple_choice': {
      const options = q.options.map((o) => o.trim()).filter(Boolean)
      const ids = ['A', 'B', 'C', 'D'].slice(0, options.length)
      const answer = q.answer.trim().toUpperCase().replace(/[^A-D]/g, '')
      if (options.length < 3 || !ids.includes(answer)) return null
      return { ...base, type: 'multiple_choice', options: options.map((text, i) => ({ id: ids[i], text })), answer }
    }
    case 'true_false': {
      const answer = q.answer.trim().toLowerCase()
      if (answer !== 'true' && answer !== 'false') return null
      return { ...base, type: 'true_false', answer: answer === 'true' }
    }
    case 'speak_answer': {
      // Stored answers are normalized the same way spoken ones are, and must fit without being cut.
      if (!isStorableAnswer(q.answer)) return null
      const answer = normalizeAnswer(q.answer)
      return { ...base, type: 'speak_answer', answer }
    }
  }
}

/**
 * Makes a whole experience in one go, as fast as the models allow:
 * 1. Crafting: the outline, then all five levels' slides in parallel.
 * 2. Visualizing: every picture in parallel (up to IMAGE_CONCURRENCY at once).
 * 3. Creating Assessment: the questions, written while the pictures draw.
 * Nothing here is reviewed by a person, so every model output is checked.
 */
export async function createExperience(req: Request, onProgress: (p: Progress) => void): Promise<NewExperience> {
  const progress: Progress = {
    title: req.topic,
    focus: req.focus,
    active: 0,
    lessons: LEVELS,
    pictures: 0,
    picturesDone: 0,
    questions: LEVELS * QUESTIONS_PER_LEVEL,
  }
  const emit = (patch: Partial<Progress>) => onProgress(Object.assign(progress, patch))
  emit({})

  const brief = `Topic: ${req.topic}\nWhat the learner knows already: ${req.learnerLevel}\nWhat they want to focus on: ${req.focus}`

  // 1. Crafting
  const outline = await retry(2, () =>
    generateJson(Outline, WRITER, `Plan a learning experience of exactly ${LEVELS} levels.\n\n${brief}`),
  )
  emit({ title: outline.title, focus: outline.focus })

  const slides = await Promise.all(
    outline.levels.map((level, i) =>
      retry(2, () =>
        generateJson(
          LevelSlides,
          WRITER,
          `${brief}\n\nThe experience: ${outline.headline}\nAll levels: ${outline.levels.map((l, n) => `${n + 1}. ${l.title}`).join('; ')}\n\n` +
            `Write the slides for level ${i + 1}, "${level.title}": ${level.covers}\nBy the end the learner can: ${level.objectives.join('; ')}.`,
        ),
      ),
    ),
  )

  // 2. Visualizing, with 3. Creating Assessment running alongside.
  const experienceKey = randomUUID()
  const specs: { key: string; spec: ImageSpec }[] = [
    { key: 'cover', spec: outline.cover },
    ...slides.flatMap((level, i) => level.slides.map((s, j) => ({ key: `l${i + 1}-s${j + 1}`, spec: s.image }))),
  ]
  emit({ active: 1, pictures: specs.length })

  const questions = Promise.all(
    slides.map((level, i) =>
      retry(2, () =>
        generateJson(
          LevelQuestions,
          WRITER,
          `${brief}\n\nWrite ${QUESTIONS_PER_LEVEL} questions for level ${i + 1}, "${outline.levels[i].title}", that check only what these slides teach. ` +
            `Mix the types. Speak-your-answer answers must be one or two plain words of at most ${SPOKEN_ANSWER_MAX} letters.\n\n` +
            level.slides.map((s, n) => `Slide ${n + 1}: ${s.narration}`).join('\n'),
        ),
      ),
    ),
  )

  const images = await pool(
    config.gemini.imageConcurrency,
    specs.map(({ key, spec }) => async () => {
      const prompt = imagePrompt(spec, outline.style, outline.title)
      let url = PLACEHOLDER
      try {
        const image = await retry(2, () => generateImage(prompt))
        url = await saveImage(`${experienceKey}/${key}`, image.data, image.mimeType)
      } catch (err) {
        // Don't hold the learner up for one picture: the slide gets a plain backdrop.
        console.warn(`image ${key} failed: ${(err as Error).message}`)
      }
      emit({ picturesDone: progress.picturesDone + 1 })
      return { url, alt: spec.alt, prompt }
    }),
  )
  emit({ active: 2 })
  // The questions usually finish while the pictures draw; still show the step for a moment.
  const [written] = await Promise.all([questions, new Promise((r) => setTimeout(r, 900))])
  let questionCount = 0
  const levels = outline.levels.map((level, i) => {
    const lessonSlides: SlideStep[] = slides[i].slides.map((s, j) => {
      const image = images[1 + slides.slice(0, i).reduce((n, l) => n + l.slides.length, 0) + j]
      return { id: `s${j + 1}`, type: 'slide', image, narration: s.narration, talking_points: s.talking_points }
    })
    const qs = written[i].questions
      .map((q, j) => ({ step: toQuestion(q, `q${j + 1}`), after: Math.min(Math.max(q.after_slide, 1), lessonSlides.length) }))
      .filter((q): q is { step: QuestionStep; after: number } => q.step !== null)
    questionCount += qs.length

    // Each question follows the slide it checks; the lesson still ends on a question if there is one.
    const steps: Step[] = []
    lessonSlides.forEach((slide, j) => {
      steps.push(slide)
      steps.push(...qs.filter((q) => q.after === j + 1).map((q) => q.step))
    })
    const lesson: Lesson = {
      schema_version: 1,
      lesson: {
        id: `${slug(outline.title)}-${i + 1}`,
        title: level.title,
        mode: 'practice',
        intro_narration: slides[i].intro_narration,
        outro_narration: slides[i].outro_narration,
        learning_objectives: level.objectives,
      },
      steps,
    }
    return { title: level.title, rank: RANKS[i], lesson }
  })
  emit({ active: 3, questions: questionCount })

  return {
    title: outline.title,
    subject: outline.subject,
    headline: outline.headline,
    thumbnail: images[0].url,
    levels,
  }
}
