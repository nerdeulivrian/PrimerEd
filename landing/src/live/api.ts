import type { Experience } from '../home/types'

/** The backend (backend/ in the PrimerEd folder). Set in .env.local. */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '')

const TOKEN_KEY = 'primered:token'

/**
 * No accounts: the server gives this browser an anonymous learner token the
 * first time, and it's kept in localStorage.
 */
async function token(): Promise<string> {
  const saved = localStorage.getItem(TOKEN_KEY)
  if (saved) return saved
  const { token } = await post<{ token: string }>('/api/learners')
  localStorage.setItem(TOKEN_KEY, token)
  return token
}

async function request<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) headers.Authorization = `Bearer ${await token()}`
  const res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  if (res.status === 401 && auth) {
    // The server doesn't know this token (e.g. a fresh database): start a new learner.
    localStorage.removeItem(TOKEN_KEY)
    return request(method, path, body, auth)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `${res.status}`)
  return data as T
}

const post = <T>(path: string, body?: unknown, auth = false) => request<T>('POST', path, body, auth)

export interface Rtc {
  appId: string
  channel: string
  uid: number
  token: string
  agentUid: string
}

export const api = {
  experiences: () => request<Experience[]>('GET', '/api/experiences', undefined, true),
  startHome: () => post<{ sessionId: string; rtc: Rtc }>('/api/home-sessions', undefined, true),
  events: (sessionId: string) => new EventSource(`${API_URL}/api/sessions/${sessionId}/events`),
  result: (sessionId: string, callId: string, result: unknown) =>
    post(`/api/sessions/${sessionId}/results`, { callId, result }),
  stop: (sessionId: string) => post(`/api/sessions/${sessionId}/stop`).catch(() => {}),
  /** Works while the page is closing. */
  stopBeacon: (sessionId: string) => navigator.sendBeacon(`${API_URL}/api/sessions/${sessionId}/stop`),
}
