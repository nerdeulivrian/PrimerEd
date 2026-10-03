import type { MiddlewareHandler } from 'hono'
import { jwtVerify, SignJWT } from 'jose'
import { config } from './config.ts'
import { learnerExists } from './db.ts'

/**
 * No accounts: each browser gets an anonymous learner and a signed token
 * (kept in localStorage). The token only proves which learner this is; the
 * server talks to Postgres with its own credentials.
 */
export function signLearnerToken(learnerId: string) {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(learnerId).setIssuedAt().sign(config.jwtSecret)
}

export async function verifyLearnerToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, config.jwtSecret, { algorithms: ['HS256'] })
    return payload.sub && (await learnerExists(payload.sub)) ? payload.sub : null
  } catch {
    return null
  }
}

export type AuthEnv = { Variables: { learnerId: string } }

/** Requires `Authorization: Bearer <token>`. */
export const requireLearner: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const token = c.req.header('authorization')?.match(/^Bearer (.+)$/)?.[1]
  const learnerId = token ? await verifyLearnerToken(token) : null
  if (!learnerId) return c.json({ error: 'Unknown learner' }, 401)
  c.set('learnerId', learnerId)
  await next()
}
