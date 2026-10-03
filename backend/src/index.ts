import { mkdir } from 'node:fs/promises'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { homeAgent, handleHomeTool } from './agents/home.ts'
import { handleLessonTool, lessonAgent } from './agents/lesson.ts'
import { closeTunnel, TOOL_SECRET, toolsUrlReady } from './agora.ts'
import { requireLearner, signLearnerToken, type AuthEnv } from './auth.ts'
import { config } from './config.ts'
import { createLearner, listExperiences, migrate, peekLaunch, pool, useLaunch } from './db.ts'
import { closeAll, closeSession, getSession, openSession, resolveCall } from './sessions.ts'
import { MEDIA_DIR } from './storage.ts'

await mkdir(MEDIA_DIR, { recursive: true })
await migrate()

// ---------- The API, for the two frontends ----------

const app = new Hono<AuthEnv>()
app.use('/api/*', cors({ origin: [config.landingUrl, config.lessonUrl] }))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message }, 500)
})

/** A new anonymous learner. The browser keeps the token and sends it as a Bearer token. */
app.post('/api/learners', async (c) => {
  const id = await createLearner()
  return c.json({ token: await signLearnerToken(id) })
})

app.get('/api/experiences', requireLearner, async (c) => c.json(await listExperiences(c.get('learnerId'))))

/** Starts the home voice session (after the orb tap). The browser then joins the Agora channel. */
app.post('/api/home-sessions', requireLearner, async (c) => {
  const learnerId = c.get('learnerId')
  const session = await openSession('home', learnerId, await homeAgent(learnerId))
  return c.json({ sessionId: session.id, rtc: session.channel.rtc })
})

/** Starts a level's voice session from the one-time code landing hands over. */
/** What a launch code opens, before START: the lesson page shows the level while it gets ready. */
app.get('/api/launches/:code', async (c) => {
  const level = await peekLaunch(c.req.param('code'))
  if (!level) return c.json({ error: 'This link has expired. Go back and open the level again.' }, 410)
  return c.json({ lesson: level.lesson, level: { experienceId: level.experienceId, number: level.position + 1 } })
})

app.post('/api/lesson-sessions', async (c) => {
  const { launch } = await c.req.json<{ launch?: string }>()
  const used = launch ? await useLaunch(launch) : null
  if (!used) return c.json({ error: 'This link has expired. Go back and open the level again.' }, 410)
  const { learnerId, level } = used
  const session = await openSession('lesson', learnerId, lessonAgent(level), level.id)
  return c.json({
    sessionId: session.id,
    rtc: session.channel.rtc,
    // The lesson engine runs in the browser for now, so it gets the full lesson (see README).
    lesson: level.lesson,
    level: { experienceId: level.experienceId, number: level.position + 1 },
    backUrl: `${config.landingUrl}/?experience=${level.experienceId}`,
  })
})

/** UI updates and relayed tool calls, as server-sent events. */
app.get('/api/sessions/:id/events', (c) => {
  const session = getSession(c.req.param('id'))
  if (!session) return c.json({ error: 'No such session' }, 404)
  return streamSSE(c, async (stream) => {
    session.streams.add(stream)
    stream.onAbort(() => {
      session.streams.delete(stream)
    })
    await stream.writeSSE({ event: 'ready', data: '{}' })
    // Keep idle proxies from closing the stream.
    while (!stream.aborted && getSession(session.id)) {
      await stream.sleep(15000)
      await stream.write(': keep-alive\n\n')
    }
  })
})

/** The browser's result for a relayed tool call. */
app.post('/api/sessions/:id/results', async (c) => {
  const session = getSession(c.req.param('id'))
  if (!session) return c.json({ error: 'No such session' }, 404)
  const { callId, result } = await c.req.json<{ callId: string; result: unknown }>()
  return resolveCall(session, callId, result) ? c.json({ ok: true }) : c.json({ error: 'No such call' }, 404)
})

/** Ends the session (Stop, leaving the page, or the hand-off to a lesson). Also takes sendBeacon. */
app.post('/api/sessions/:id/stop', async (c) => {
  const session = getSession(c.req.param('id'))
  if (session) await closeSession(session)
  return c.json({ ok: true })
})

app.use('/media/*', serveStatic({ root: MEDIA_DIR, rewriteRequestPath: (p) => p.replace(/^\/media/, '') }))
app.get('/placeholder.svg', (c) => {
  c.header('Content-Type', 'image/svg+xml')
  c.header('Cache-Control', 'public, max-age=86400')
  return c.body(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF0DC"/><stop offset="1" stop-color="#FFD9A8"/></linearGradient></defs><rect width="16" height="9" fill="url(#g)"/></svg>',
  )
})
app.get('/health', (c) => c.json({ ok: true }))

// ---------- Tool calls, from Agora's cloud ----------
// The only thing the tunnel exposes. Every call must carry the secret header.

const tools = new Hono()
tools.post('/tools/:sessionId/:tool', async (c) => {
  if (c.req.header('x-tool-secret') !== TOOL_SECRET) return c.json({ error: 'Unauthorized' }, 401)
  const session = getSession(c.req.param('sessionId'))
  if (!session) return c.json({ success: false, error: 'This voice session has ended.' }, 410)
  const raw = await c.req.json<Record<string, unknown>>().catch(() => ({}))
  // Agora leaves a placeholder in place when the model left an argument out.
  const args = Object.fromEntries(
    Object.entries(raw)
      .filter(([k, v]) => k !== 'tool_call_id' && !(typeof v === 'string' && /^\{\{.*\}\}$/.test(v)))
      .map(([k, v]) => [k, v == null ? undefined : String(v)]),
  ) as Record<string, string | undefined>
  const name = c.req.param('tool')
  console.log(`tool ${session.kind}.${name}(${JSON.stringify(args)})`)
  const result =
    session.kind === 'home' ? await handleHomeTool(session, name, args) : await handleLessonTool(session, name, args)
  const failed = typeof result === 'object' && result !== null && 'success' in result && result.success === false
  return c.json(result ?? { success: true }, failed ? 400 : 200)
})

serve({ fetch: app.fetch, port: config.port }, () => console.log(`PrimerEd API → http://localhost:${config.port}`))
serve({ fetch: tools.fetch, port: config.toolsPort, hostname: '127.0.0.1' })
toolsUrlReady.then((url) => console.log(url ? `Tool calls → ${url}/tools/*` : 'Tool calls are OFF (no public URL)'))

async function shutdown() {
  await closeAll()
  closeTunnel()
  await pool.end()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
