import type { Outline } from './schemas.ts'
import type { ImageSpec } from './schemas.ts'

/**
 * Turns Flash-Lite's picture fields into the prompt for Nano Banana 2 Lite.
 * The images aren't reviewed, so the prompt is deliberately complete: the
 * frame, the subject and what must be right, one style for the whole
 * experience, and a hard rule against text (the app draws all slide text,
 * and image models misspell).
 */
export function imagePrompt(spec: ImageSpec, style: Outline['style'], topic: string): string {
  const lines = [
    `A widescreen 16:9 illustration for a slide in a lesson about ${topic}.`,
    '',
    `Subject: ${spec.subject}`,
    `It must clearly and accurately show: ${spec.must_show.join('; ')}.`,
    `Composition: ${spec.composition} Fill the whole 16:9 frame edge to edge. Keep every important element well inside the frame, away from the edges, with nothing cropped. One clear focal point, uncluttered, readable at a glance on a phone screen.`,
    `Setting: ${spec.setting}`,
    '',
    `Style (the same for every picture in this lesson): ${style.medium}. Colour palette: ${style.palette}. Mood: ${style.mood}. Even, soft lighting, clean shapes, high contrast between the subject and the background.`,
    '',
    'Accuracy: this is for teaching, so everything shown must be factually and scientifically correct, with correct proportions, counts and relationships. When unsure, show less, not something wrong.',
    'Absolutely no text of any kind: no words, letters, numbers, labels, captions, signs, equations, watermarks, logos, signatures or user-interface elements. Show ideas with shapes, objects and colour only.',
    'No borders, frames, collage panels or split screens. Not a photo of a screen or a slide.',
  ]
  if (spec.avoid.length) lines.push(`Also avoid: ${spec.avoid.join('; ')}.`)
  return lines.join('\n')
}
