import { Pause, Play, RotateCcw, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { validateLesson } from '../lesson/validate'
import type { Lesson } from '../lesson/types'
import { currentStep, lessonForAI } from '../session/engine'
import type { SessionState } from '../session/state'
import type { LogEntry, SessionStore, Snapshot } from '../session/store'
import { toolDeclarations, type ToolCall } from '../session/tools'
import { demoStrategies, nextDemoAction, type DemoStrategy } from './demo'
import { CallButton, QuickActions } from './QuickActions'

type Tab = 'calls' | 'lesson' | 'ai'

const DEMO_INTERVAL_MS = 1100

function templateFor(name: string, session: SessionState): ToolCall {
  const decl = toolDeclarations.find((d) => d.name === name)
  const args: Record<string, unknown> = {}
  const stepId = session.phase === 'lesson' ? currentStep(session).id : 's1'
  for (const key of Object.keys(decl?.parameters.properties ?? {})) {
    args[key] = key === 'step_id' ? stepId : ''
  }
  return Object.keys(args).length ? { name, args } : { name }
}

function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b border-zinc-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function StatusLine({ session }: { session: SessionState }) {
  const items: [string, string][] = [['phase', session.phase]]
  if (session.phase === 'lesson') {
    const step = currentStep(session)
    const response = session.responses[step.id]
    const result = session.results[step.id]
    items.push(
      ['step', `${step.id} · ${step.type} (${session.stepIndex + 1}/${session.lesson.steps.length})`],
      ['answer', response ? JSON.stringify(response.value) : '—'],
      ['feedback', result ? (result.correct ? 'correct' : 'incorrect') : 'hidden'],
    )
  }
  if (session.summary) items.push(['score', `${session.summary.score}/${session.summary.total} · ${session.summary.tier}`])
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[12px]">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-zinc-400">{k}</dt>
          <dd className="truncate text-zinc-800">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function formatCall(call: ToolCall) {
  const args = call.args ? Object.values(call.args).map((v) => JSON.stringify(v)).join(', ') : ''
  return `${call.name}(${args})`
}

function LogView({ log }: { log: LogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log.length])

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
      {log.length === 0 && (
        <p className="text-[12px] text-zinc-400">No calls yet. Function results sent back to the AI show up here.</p>
      )}
      {log.map((entry) =>
        entry.kind === 'event' ? (
          <div key={entry.id} className="shrink-0 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[12px] text-amber-800">
            {entry.text}
          </div>
        ) : (
          <div
            key={entry.id}
            className={`shrink-0 overflow-hidden rounded border text-[12px] ${entry.ok ? 'border-zinc-200' : 'border-red-300'}`}
          >
            <div className={`px-2 py-1 font-mono font-semibold ${entry.ok ? 'bg-zinc-50 text-violet-700' : 'bg-red-50 text-red-700'}`}>
              → {formatCall(entry.call)}
            </div>
            <pre className={`max-h-48 overflow-auto px-2 py-1 font-mono text-[11px] whitespace-pre-wrap ${entry.ok ? 'text-zinc-700' : 'text-red-700'}`}>
              ← {JSON.stringify(entry.result, null, 2)}
            </pre>
          </div>
        ),
      )}
    </div>
  )
}

function RawCallEditor({ session, onCall }: { session: SessionState; onCall: (call: ToolCall) => void }) {
  const [text, setText] = useState('{\n  "name": "start_lesson"\n}')
  const [error, setError] = useState<string | null>(null)

  const send = () => {
    try {
      const parsed = JSON.parse(text) as ToolCall | ToolCall[]
      const calls = Array.isArray(parsed) ? parsed : [parsed]
      if (calls.some((c) => typeof c?.name !== 'string')) throw new Error('Each call needs a "name".')
      calls.forEach(onCall)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {toolDeclarations.map((d) => (
          <button
            key={d.name}
            type="button"
            title={d.description}
            onClick={() => setText(JSON.stringify(templateFor(d.name, session), null, 2))}
            className="cursor-pointer rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600 hover:bg-zinc-200"
          >
            {d.name}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
        }}
        spellCheck={false}
        rows={5}
        className="w-full resize-y rounded-md border border-zinc-300 p-2 font-mono text-[12px] outline-none focus:border-violet-500"
      />
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">One call or an array of calls · ⌘↵ to send</span>
        <CallButton variant="primary" onClick={send}>
          Send call
        </CallButton>
      </div>
    </div>
  )
}

function DemoControls({ store, session }: { store: SessionStore; session: SessionState }) {
  const [strategy, setStrategy] = useState<DemoStrategy>('correct')
  const [playing, setPlaying] = useState(false)
  const answered = useRef(new Set<string>())

  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => {
      const action = nextDemoAction(store.getSnapshot().session, strategy, answered.current)
      if (action.kind === 'tap') store.tapStart()
      else if (action.kind === 'call') store.call(action.call)
      else setPlaying(false)
    }, DEMO_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [playing, session, strategy, store])

  return (
    <div className="flex items-center gap-2">
      <select
        value={strategy}
        onChange={(e) => setStrategy(e.target.value as DemoStrategy)}
        className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px]"
      >
        {demoStrategies.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <CallButton
        variant={playing ? 'default' : 'primary'}
        onClick={() => {
          if (!playing) answered.current = new Set()
          setPlaying(!playing)
        }}
      >
        <span className="flex items-center gap-1">
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {playing ? 'Pause' : 'Play demo'}
        </span>
      </CallButton>
    </div>
  )
}

function LessonEditor({ store, lesson }: { store: SessionStore; lesson: Lesson }) {
  const [text, setText] = useState(() => JSON.stringify(lesson, null, 2))
  const [errors, setErrors] = useState<string[]>([])
  const [applied, setApplied] = useState(false)

  const apply = () => {
    setApplied(false)
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (err) {
      setErrors([`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`])
      return
    }
    const problems = validateLesson(parsed)
    setErrors(problems)
    if (problems.length === 0) {
      store.load(parsed as Lesson)
      setApplied(true)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
      <p className="text-[12px] text-zinc-500">
        Draft lesson JSON (KNOWLEDGE.md §5). Edit and apply to restart the session with it. Field names aren't final.
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setApplied(false)
        }}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none rounded-md border border-zinc-300 p-2 font-mono text-[11px] outline-none focus:border-violet-500"
      />
      {errors.length > 0 && (
        <ul className="max-h-32 overflow-auto rounded border border-red-200 bg-red-50 p-2 text-[12px] text-red-700">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-end gap-2">
        {applied && <span className="text-[12px] text-emerald-600">Applied · session restarted</span>}
        <CallButton onClick={() => setText(JSON.stringify(lesson, null, 2))}>Revert</CallButton>
        <CallButton variant="primary" onClick={apply}>
          Validate &amp; apply
        </CallButton>
      </div>
    </div>
  )
}

export function SimulatorPanel({
  store,
  snapshot,
  onClose,
}: {
  store: SessionStore
  snapshot: Snapshot
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('calls')
  const { session, log } = snapshot
  const onCall = (call: ToolCall) => store.call(call)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'calls', label: 'Tool calls' },
    { id: 'lesson', label: 'Lesson JSON' },
    { id: 'ai', label: 'What the AI sees' },
  ]

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-zinc-200 bg-white md:w-[420px] md:border-l">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div>
          <h1 className="text-[14px] font-bold text-zinc-900">Voice AI simulator</h1>
          <p className="text-[11px] text-zinc-500">Play the AI: send the function calls it would make.</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => store.reset()}
            className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12px] text-zinc-600 hover:bg-zinc-100"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Back to the app (`)"
            aria-label="Close the simulator"
            className="cursor-pointer rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <nav className="flex border-b border-zinc-200 px-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`cursor-pointer border-b-2 px-3 py-2 text-[12px] font-semibold ${
              tab === t.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'calls' && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0">
            <Section title="State">
              <StatusLine session={session} />
            </Section>
            <Section title="Next calls">
              <QuickActions session={session} onCall={onCall} onTapStart={() => store.tapStart()} />
            </Section>
            <Section title="Demo session">
              <DemoControls store={store} session={session} />
            </Section>
            <Section title="Raw call">
              <RawCallEditor session={session} onCall={onCall} />
            </Section>
          </div>
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <h2 className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">Log · results sent to the AI</h2>
            <button
              type="button"
              onClick={() => store.clearLog()}
              className="cursor-pointer text-zinc-400 hover:text-zinc-700"
              aria-label="Clear log"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <LogView log={log} />
        </div>
      )}

      {tab === 'lesson' && <LessonEditor key={session.lesson.lesson.id} store={store} lesson={session.lesson} />}

      {tab === 'ai' && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
          <p className="text-[12px] text-zinc-500">
            The payload the voice AI gets: the lesson with every <code className="font-mono">answer</code> removed. It
            only learns results from <code className="font-mono">submit_answer</code>.
          </p>
          <pre className="min-h-0 flex-1 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-2 font-mono text-[11px] text-zinc-700">
            {JSON.stringify(lessonForAI(session.lesson), null, 2)}
          </pre>
          <details className="text-[12px] text-zinc-600">
            <summary className="cursor-pointer font-semibold">Function declarations</summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-2 font-mono text-[11px]">
              {JSON.stringify(toolDeclarations, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </aside>
  )
}
