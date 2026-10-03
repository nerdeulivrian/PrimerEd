import type { Lesson } from '../lesson/types'

/** The backend (backend/ in the PrimerEd folder). Set in .env.local. */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '')

export interface Rtc {
  appId: string
  channel: string
  uid: number
  token: string
  agentUid: string
}

export interface Launch {
  lesson: Lesson
  level: { experienceId: string; number: number }
}

export interface LessonSession extends Launch {
  sessionId: string
  rtc: Rtc
  /** The level path in landing, for after EXIT. */
  backUrl: string
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = body === undefined ? {} : { 'Content-Type': 'application/json' }
  const res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `${res.status}`)
  return data as T
}

/** No learner token here: the one-time launch code from landing stands for the learner and the level. */
export const api = {
  /** The level, without using up the code. */
  launch: (code: string) => request<Launch>('GET', `/api/launches/${encodeURIComponent(code)}`),
  /** Uses up the code and starts the level's voice agent. */
  start: (code: string) => request<LessonSession>('POST', '/api/lesson-sessions', { launch: code }),
  events: (sessionId: string) => new EventSource(`${API_URL}/api/sessions/${sessionId}/events`),
  result: (sessionId: string, callId: string, result: unknown) =>
    request('POST', `/api/sessions/${sessionId}/results`, { callId, result }).catch(() => {}),
  stop: (sessionId: string) => request('POST', `/api/sessions/${sessionId}/stop`).catch(() => {}),
  /** Works while the page is closing. */
  stopBeacon: (sessionId: string) => navigator.sendBeacon(`${API_URL}/api/sessions/${sessionId}/stop`),
}
