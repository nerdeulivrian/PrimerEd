import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes, randomInt } from 'node:crypto'
import agoraToken from 'agora-token'
import { config } from './config.ts'

const { RtcTokenBuilder, RtcRole } = agoraToken

/**
 * Agora's Conversational AI Engine runs the voice agent: the browser joins an
 * Agora channel, and the agent in that channel talks to Gemini Live.
 * Adapted from functionCallingtestAgoraxGemini/server.js.
 */
const API = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${config.agora.appId}`
const AGENT_UID = '10001'
const TOKEN_TTL = 3600

/** Agora sends this header on every tool call, so other callers of the public URL are refused. */
export const TOOL_SECRET = process.env.TOOL_SECRET || randomBytes(24).toString('hex')

export interface Channel {
  channel: string
  /** For the browser: join the channel with these. */
  rtc: { appId: string; channel: string; uid: number; token: string; agentUid: string }
  agentToken: string
}

export function newChannel(): Channel {
  const channel = `primered-${randomBytes(6).toString('hex')}`
  const uid = randomInt(100000, 999999)
  const { appId, appCertificate } = config.agora
  const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channel, uid, RtcRole.PUBLISHER, TOKEN_TTL, TOKEN_TTL)
  // The agent's RTC+RTM token doubles as the REST auth token; it must match the channel and agent uid.
  const agentToken = RtcTokenBuilder.buildTokenWithRtm(appId, appCertificate, channel, AGENT_UID, RtcRole.PUBLISHER, TOKEN_TTL, TOKEN_TTL)
  return { channel, rtc: { appId, channel, uid, token, agentUid: AGENT_UID }, agentToken }
}

function authHeader(agentToken: string) {
  const { customerId, customerSecret } = config.agora
  if (customerId && customerSecret) return `Basic ${Buffer.from(`${customerId}:${customerSecret}`).toString('base64')}`
  return `agora token=${agentToken}`
}

async function request(path: string, agentToken: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader(agentToken) },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Agora ${res.status}: ${text}`)
  return text ? JSON.parse(text) : {}
}

/** A function the agent can call. Agora POSTs its arguments to our tools server. */
export interface Tool {
  /** Letters and numbers only (Agora's rule). */
  name: string
  description: string
  parameters: Record<string, { type: 'string'; description: string; enum?: string[] }>
  required: string[]
  timeoutMs?: number
}

function toAgoraTool(tool: Tool, baseUrl: string, sessionId: string) {
  // Each body value is a whole placeholder: Agora can't mix placeholders with other text.
  const body: Record<string, string> = { tool_call_id: '{{tool_call_id}}' }
  for (const name of Object.keys(tool.parameters)) body[name] = `{{args.${name}}}`
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: { type: 'object', properties: tool.parameters, required: tool.required, additionalProperties: false },
    },
    execution: { mode: 'sync' },
    server: {
      method: 'POST',
      url: `${baseUrl}/tools/${sessionId}/${tool.name}`,
      headers: { 'X-Tool-Secret': TOOL_SECRET },
      body,
      timeout_ms: tool.timeoutMs ?? 10000,
    },
  }
}

export interface AgentOptions {
  channel: Channel
  sessionId: string
  instructions: string
  /** Spoken first, as soon as the learner joins: the AI always speaks first. */
  greeting: string
  tools: Tool[]
}

export async function startAgent(opts: AgentOptions): Promise<string> {
  const toolsUrl = await toolsUrlReady
  if (!toolsUrl) throw new Error('No public URL for tool calls: install cloudflared or set PUBLIC_URL')
  const { channel, rtc, agentToken } = opts.channel
  const body = {
    name: `${channel}-${randomBytes(3).toString('hex')}`,
    properties: {
      channel,
      token: agentToken,
      agent_rtc_uid: AGENT_UID,
      remote_rtc_uids: [String(rtc.uid)],
      idle_timeout: 30,
      parameters: { data_channel: 'datastream' },
      advanced_features: { enable_tools: true },
      mllm: {
        enable: true,
        vendor: 'gemini',
        // Required for Gemini 3.8 models.
        url: 'https://generativelanguage.googleapis.com',
        api_key: config.gemini.apiKey,
        params: {
          model: `models/${config.gemini.liveModel}`,
          instructions: opts.instructions,
          voice: config.gemini.voice,
          transcribe_agent: true,
          transcribe_user: true,
          http_options: { api_version: 'v1beta' },
        },
        tools: opts.tools.map((t) => toAgoraTool(t, toolsUrl, opts.sessionId)),
        input_modalities: ['audio'],
        output_modalities: ['audio'],
        greeting_message: opts.greeting,
        failure_message: 'Sorry, something went wrong on my side. Could you say that again?',
        turn_detection: {
          mode: 'server_vad',
          server_vad_config: {
            prefix_padding_ms: 800,
            silence_duration_ms: 640,
            start_of_speech_sensitivity: 'START_SENSITIVITY_HIGH',
            end_of_speech_sensitivity: 'END_SENSITIVITY_HIGH',
          },
        },
      },
    },
  }
  const { agent_id: agentId } = await request('/join', agentToken, body)
  return agentId as string
}

export async function stopAgent(agentId: string, agentToken: string) {
  await request(`/agents/${agentId}/leave`, agentToken, {})
}

// ---------- Public URL for tool calls ----------
// Agora's cloud calls tool endpoints over public HTTPS. Use PUBLIC_URL if set; otherwise open a
// cloudflared quick tunnel to the tools-only server (never the main API).

let tunnel: ChildProcess | null = null

export const toolsUrlReady: Promise<string | null> = config.publicUrl
  ? Promise.resolve(config.publicUrl)
  : new Promise((resolve) => {
      const done = (url: string | null) => {
        clearTimeout(timer)
        resolve(url)
      }
      const timer = setTimeout(() => {
        console.warn('The cloudflared tunnel did not come up in time: tool calls are off.')
        done(null)
      }, 30000)
      tunnel = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${config.toolsPort}`])
      const onOutput = (buf: Buffer) => {
        const url = String(buf)
          .match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g)
          ?.find((u) => u !== 'https://api.trycloudflare.com')
        if (url) done(url)
      }
      tunnel.stdout?.on('data', onOutput)
      tunnel.stderr?.on('data', onOutput)
      tunnel.on('error', () => {
        console.warn('cloudflared not found: tool calls are off. Run `brew install cloudflared` or set PUBLIC_URL.')
        done(null)
      })
    })

export function closeTunnel() {
  tunnel?.kill()
}
