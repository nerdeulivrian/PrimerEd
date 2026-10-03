import type { IAgoraRTCClient, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng'
import type { Rtc } from './api'

/** What the agent sends over the channel's data stream (Agora Conversational AI). */
export type AgentMessage =
  /** turn_status: 0 = in progress, 1 = finished, 2 = interrupted. `text` is the whole turn so far. */
  | { object: 'assistant.transcription'; turn_id: number; text: string; turn_status: number }
  | { object: 'user.transcription'; turn_id: number; text: string; final: boolean }
  | { object: 'message.interrupt'; turn_id: number }
  /** state: 'silent' | 'listening' | 'thinking' | 'speaking' */
  | { object: 'message.state'; state: string; turn_id: number }
  | { object: string; [key: string]: unknown }

/**
 * The browser end of the voice session: joins the Agora channel, sends the
 * mic, plays the agent, and decodes the agent's transcript messages.
 * Adapted from functionCallingtestAgoraxGemini/public/app.js.
 */
export class Voice {
  private client: IAgoraRTCClient | null = null
  private mic: IMicrophoneAudioTrack | null = null
  private pending = new Map<string, { parts: Map<number, string>; total: number | null }>()
  private onMessage: (message: AgentMessage) => void

  constructor(onMessage: (message: AgentMessage) => void) {
    this.onMessage = onMessage
  }

  /** Asks for the mic first: call it from the tap, so the browser allows it. */
  static async openMic(): Promise<IMicrophoneAudioTrack> {
    const { default: AgoraRTC } = await import('agora-rtc-sdk-ng')
    AgoraRTC.setLogLevel(3)
    return AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true })
  }

  async join(rtc: Rtc, mic: IMicrophoneAudioTrack) {
    const { default: AgoraRTC } = await import('agora-rtc-sdk-ng')
    this.mic = mic
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
    this.client = client
    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType)
      if (mediaType === 'audio') user.audioTrack?.play()
    })
    client.on('stream-message', (_uid: number, data: Uint8Array) => this.decode(data))
    await client.join(rtc.appId, rtc.channel, rtc.token, rtc.uid)
    await client.publish(mic)
  }

  /** Stops sending the mic without leaving the channel (the track stays open). */
  async setMuted(muted: boolean) {
    if (this.mic && this.mic.muted !== muted) await this.mic.setMuted(muted)
  }

  async leave() {
    this.mic?.close()
    this.mic = null
    await this.client?.leave().catch(() => {})
    this.client = null
    this.pending.clear()
  }

  // Messages arrive as "<message_id>|<part_idx>|<part_sum>|<base64 slice>".
  private decode(data: Uint8Array) {
    const utf8 = new TextDecoder()
    const raw = utf8.decode(data)
    const [id, idx, sum, content] = raw.split('|')
    if (content === undefined) {
      try {
        this.onMessage(JSON.parse(raw))
      } catch {
        /* not a message */
      }
      return
    }
    const entry = this.pending.get(id) ?? { parts: new Map(), total: null }
    entry.parts.set(Number(idx), content)
    if (sum !== '???') entry.total = Number(sum)
    this.pending.set(id, entry)
    if (!entry.total || entry.parts.size < entry.total) return
    this.pending.delete(id)
    const b64 = [...entry.parts.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c).join('')
    try {
      this.onMessage(JSON.parse(utf8.decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)))))
    } catch {
      /* a broken message: skip it */
    }
  }
}
