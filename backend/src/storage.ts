import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.ts'

/**
 * Slide images. Locally they're files in `media/`, served by this server at
 * /media. Deployed, this becomes S3 + CloudFront with the same interface.
 */
export const MEDIA_DIR = path.resolve('media')
const MEDIA_URL = process.env.MEDIA_URL?.replace(/\/+$/, '') ?? `http://localhost:${config.port}/media`

const extension: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

/** Saves an image and returns its public URL. `key` is a path like "<experience>/<slide>". */
export async function saveImage(key: string, data: Buffer, mimeType: string): Promise<string> {
  const file = `${key}.${extension[mimeType] ?? 'png'}`
  const full = path.join(MEDIA_DIR, file)
  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, data)
  return `${MEDIA_URL}/${file}`
}
