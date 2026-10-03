export const SPOKEN_ANSWER_MAX = 14

/** The normalization below without the length cap. */
function normalizeFull(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
}

/**
 * Normalizes a spoken answer for exact-match grading (KNOWLEDGE.md §4):
 * trim, lowercase, spaces/hyphens/underscores become a dash, repeated
 * separators collapse, anything that isn't a letter, digit or dash is
 * removed, and the result is capped at 14 characters.
 */
export function normalizeAnswer(raw: string): string {
  return normalizeFull(raw).slice(0, SPOKEN_ANSWER_MAX)
}

/** A stored answer must be non-empty and fit in 14 characters without being cut. */
export function isStorableAnswer(raw: string): boolean {
  const full = normalizeFull(raw)
  return full.length > 0 && full.length <= SPOKEN_ANSWER_MAX
}
