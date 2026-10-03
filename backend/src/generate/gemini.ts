import { GoogleGenAI } from '@google/genai'
import type { z } from 'zod'
import { toJSONSchema } from 'zod'
import { config } from '../config.ts'

const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey })

/** JSON Schema for the model, without the keys Gemini doesn't need. */
function schemaFor(schema: z.ZodType) {
  const { $schema: _, ...json } = toJSONSchema(schema, { target: 'draft-2020-12' }) as Record<string, unknown>
  return json
}

/**
 * One Flash-Lite call that must return JSON matching `schema`. Thinking is
 * kept minimal for speed; the schema and the checks after do the work.
 */
export async function generateJson<T extends z.ZodType>(schema: T, system: string, input: string): Promise<z.infer<T>> {
  const interaction = await ai.interactions.create({
    model: config.gemini.textModel,
    system_instruction: system,
    input,
    generation_config: { thinking_level: 'minimal' },
    response_format: { type: 'text', mime_type: 'application/json', schema: schemaFor(schema) },
    store: false,
  })
  const text = interaction.output_text
  if (!text) throw new Error('The text model returned nothing')
  return schema.parse(JSON.parse(text))
}

/** One Nano Banana 2 Lite image, 16:9 at 1K (the Lite model's only size). */
export async function generateImage(prompt: string): Promise<{ data: Buffer; mimeType: string }> {
  const interaction = await ai.interactions.create({
    model: config.gemini.imageModel,
    input: prompt,
    response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '16:9', image_size: '1K' },
    store: false,
  })
  const image = interaction.output_image
  if (!image?.data) throw new Error('The image model returned no image')
  return { data: Buffer.from(image.data, 'base64'), mimeType: image.mime_type ?? 'image/jpeg' }
}
