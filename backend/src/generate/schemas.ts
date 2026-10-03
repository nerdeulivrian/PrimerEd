import { z } from 'zod'

/**
 * What Flash-Lite fills in for each picture. Fields, not a free-text prompt:
 * the server turns them into the final prompt with one style block shared by
 * the whole experience (see imagePrompt.ts), since nobody reviews the images.
 */
export const ImageSpec = z.object({
  subject: z.string().describe('What the picture is of, in one plain sentence.'),
  must_show: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Concrete things that must be visible and factually correct, one per item.'),
  composition: z
    .string()
    .describe(
      'Layout in a wide 16:9 frame: where the main subject sits, what is in the foreground and background, and where the empty space is.',
    ),
  setting: z.string().describe('The background or environment, e.g. "a plain warm cream backdrop".'),
  avoid: z.array(z.string()).max(5).describe('Things that would be wrong, misleading or distracting in this picture.'),
  alt: z.string().describe('Alt text for the picture, one sentence.'),
})
export type ImageSpec = z.infer<typeof ImageSpec>

export const LEVELS = 5

export const Outline = z.object({
  title: z.string().describe('Short name of the experience, 2 to 4 words, e.g. "Algebra Basics".'),
  subject: z.string().describe('The school subject, e.g. "Mathematics" or "Science".'),
  headline: z
    .string()
    .describe('The banner line: "<title>: <what it covers>", under 60 characters, e.g. "Algebra Basics: from variables to simple equations".'),
  focus: z.string().describe('What the lessons cover, in lower case, e.g. "from variables to simple equations".'),
  style: z.object({
    medium: z
      .string()
      .describe('One illustration style for every picture, e.g. "clean flat vector illustration with soft shading".'),
    palette: z.string().describe('A small colour palette that suits the topic, e.g. "warm oranges, cream and deep teal".'),
    mood: z.string().describe('The feel of the pictures, e.g. "friendly, calm and clear".'),
  }),
  cover: ImageSpec.describe('The cover picture for the whole experience: one simple, iconic scene.'),
  levels: z
    .array(
      z.object({
        title: z.string().describe('Level title, under 30 characters, e.g. "What is a variable?".'),
        covers: z.string().describe('What this level teaches, in one or two sentences.'),
        objectives: z.array(z.string()).min(2).max(3).describe('What the learner can do after this level.'),
      }),
    )
    .length(LEVELS)
    .describe('Five levels, from easiest to hardest. Each builds on the one before.'),
})
export type Outline = z.infer<typeof Outline>

export const LevelSlides = z.object({
  intro_narration: z.string().describe('What the tutor says to open the level, 1 or 2 spoken sentences.'),
  outro_narration: z.string().describe('What the tutor says at the end, 1 or 2 spoken sentences.'),
  slides: z
    .array(
      z.object({
        narration: z
          .string()
          .describe('What the tutor says on this slide: 2 to 4 short spoken sentences. Plain words, no lists, no symbols.'),
        talking_points: z
          .array(z.string())
          .min(2)
          .max(4)
          .describe('Key facts on this slide, so the tutor can answer questions about it.'),
        image: ImageSpec,
      }),
    )
    .min(4)
    .max(5),
})
export type LevelSlides = z.infer<typeof LevelSlides>

export const QUESTIONS_PER_LEVEL = 3

export const LevelQuestions = z.object({
  questions: z
    .array(
      z.object({
        type: z.enum(['multiple_choice', 'true_false', 'speak_answer']),
        after_slide: z.number().int().describe('The slide number (1-based) this question comes after.'),
        question: z.string().describe('The question as shown on screen, under 120 characters.'),
        narration: z.string().describe('How the tutor asks it out loud. For multiple choice, read the options with their letters.'),
        options: z
          .array(z.string())
          .max(4)
          .describe('multiple_choice only: 3 or 4 short options, in order A, B, C, D. Empty for the other types.'),
        answer: z
          .string()
          .describe(
            'multiple_choice: the letter of the right option ("A"–"D"). true_false: "true" or "false". speak_answer: the answer as one or two plain words, at most 14 letters, no punctuation.',
          ),
        feedback: z.object({
          correct: z.string().describe('Said when right: one encouraging sentence that also says why.'),
          incorrect: z.string().describe('Said when wrong: gives the right answer and why, kindly, in one or two sentences.'),
        }),
      }),
    )
    .length(QUESTIONS_PER_LEVEL),
})
export type LevelQuestions = z.infer<typeof LevelQuestions>
