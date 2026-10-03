import { randomBytes } from 'node:crypto'
import type { SSEStreamingApi } from 'hono/streaming'
import { newChannel, startAgent, stopAgent, type AgentOptions, type Channel } from './agora.ts'

/**
 * A live voice session: one Agora agent (Gemini Live) in one channel, for one
 * learner. `home` covers the landing screens; `lesson` is one level.
 *
 * Tool calls come from Agora's cloud to the tools server, but the screen is in
 * the learner's browser. So the session also holds the browser's event stream
 * (SSE): the server pushes UI updates down it, and "relays" a tool call by
 * pushing it to the browser and waiting for the browser to post the result.
 * Kept in memory, so this runs as one server process (see README).
 */
export interface Session {
  id: string
  kind: 'home' | 'lesson'
  learnerId: string
  channel: Channel
  agentId: string | null
  /** The lesson session's level. */
  levelId?: string
  streams: Set<SSEStreamingApi>
  pending: Map<string, (result: unknown) => void>
  /** Making an experience right now: refuse a second one. */
  generating: boolean
}

const sessions = new Map<string, Session>()

export function getSession(id: string) {
  return sessions.get(id)
}

export async function openSession(
  kind: Session['kind'],
  learnerId: string,
  agent: Omit<AgentOptions, 'channel' | 'sessionId'>,
  levelId?: string,
): Promise<Session> {
  const session: Session = {
    // Unguessable: it's the key for the event stream and the tool URLs.
    id: randomBytes(18).toString('base64url'),
    kind,
    learnerId,
    channel: newChannel(),
    agentId: null,
    levelId,
    streams: new Set(),
    pending: new Map(),
    generating: false,
  }
  sessions.set(session.id, session)
  try {
    session.agentId = await startAgent({ ...agent, channel: session.channel, sessionId: session.id })
  } catch (err) {
    sessions.delete(session.id)
    throw err
  }
  console.log(`${kind} session ${session.id} started (agent ${session.agentId})`)
  return session
}

export async function closeSession(session: Session) {
  if (!sessions.delete(session.id)) return
  for (const resolve of session.pending.values()) resolve({ success: false, error: 'The session has ended.' })
  for (const stream of session.streams) stream.abort()
  if (session.agentId) {
    await stopAgent(session.agentId, session.channel.agentToken).catch((err) => console.warn(err.message))
  }
  console.log(`${session.kind} session ${session.id} closed`)
}

export async function closeAll() {
  await Promise.allSettled([...sessions.values()].map(closeSession))
}

/** Pushes an event to the learner's screen. Returns how many screens got it. */
export function push(session: Session, event: string, data: unknown): number {
  for (const stream of session.streams) {
    stream.writeSSE({ event, data: JSON.stringify(data) }).catch(() => session.streams.delete(stream))
  }
  return session.streams.size
}

/**
 * Hands a tool call to the browser, which carries it out on screen, and waits
 * for its result. If no screen is connected, or it doesn't answer in time,
 * the AI is told so instead of being told it worked.
 */
export function relay(session: Session, name: string, args: Record<string, unknown>, timeoutMs = 8000): Promise<unknown> {
  const callId = randomBytes(8).toString('hex')
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      session.pending.delete(callId)
      resolve({ success: false, error: "The learner's screen didn't respond, so this didn't happen." })
    }, timeoutMs)
    session.pending.set(callId, (result) => {
      clearTimeout(timer)
      session.pending.delete(callId)
      resolve(result)
    })
    if (!push(session, 'tool', { callId, name, args })) {
      session.pending.get(callId)?.({ success: false, error: "The learner's screen isn't connected, so this didn't happen." })
    }
  })
}

/** The browser's result for a relayed call. */
export function resolveCall(session: Session, callId: string, result: unknown): boolean {
  const resolve = session.pending.get(callId)
  resolve?.(result)
  return Boolean(resolve)
}
