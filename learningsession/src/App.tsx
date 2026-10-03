import { Bug } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import { sampleLesson } from './lesson/sampleLesson'
import { API_URL } from './live/api'
import { LessonLive, type LiveStatus } from './live/live'
import { LessonPlayer } from './player/LessonPlayer'
import { SessionStore, useSession } from './session/store'

const store = new SessionStore(sampleLesson)

// The voice AI simulator is a debug tool: always on in dev, and in any build
// with `?debug` in the URL. It's a separate chunk, loaded only when it's on.
const params = new URLSearchParams(window.location.search)

// Live: opened from landing's level path with a one-time code, the level's
// Gemini Live agent drives the lesson. Otherwise the sample lesson, driven by
// the simulator.
const launch = params.get('launch')
const live = API_URL && launch ? new LessonLive(store, launch) : null
if (live) void live.load()
const READY: LiveStatus = { kind: 'ready' }
const noSubscribe = () => () => {}

const debugEnabled = import.meta.env.DEV || params.has('debug')
const DebugView = lazy(() => import('./simulator/DebugView').then((m) => ({ default: m.DebugView })))
const OPEN_KEY = 'primered:debug-open'

// Console access, e.g. primer.call({ name: 'start_lesson' })
if (debugEnabled) Object.assign(window, { primer: store, live })

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

/** While the live lesson loads, if it can't start, and on the way back after EXIT. */
function LiveNotice({ status }: { status: Exclude<LiveStatus, { kind: 'ready' }> }) {
  // Loading is short (the tutor is usually up already): a blank page, not a flash of text.
  if (status.kind === 'loading') return <div className="h-full bg-bg" />
  const text = status.kind === 'leaving' ? 'Back to your levels…' : status.text
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[16px] px-[15px] text-center">
      <p className={`text-[16px] font-bold text-text-secondary ${status.kind === 'error' ? '' : 'animate-pulse'}`}>{text}</p>
      {status.kind === 'error' && (
        <a href={status.backUrl || document.referrer || '/'} className="text-[14px] font-bold text-primary underline">
          Back to your levels
        </a>
      )}
    </div>
  )
}

export default function App() {
  const snapshot = useSession(store)
  const status = useSyncExternalStore(live?.subscribe ?? noSubscribe, live?.getStatus ?? (() => READY))
  const [debugOpen, setDebugOpen] = useState(
    () => debugEnabled && (params.has('debug') || localStorage.getItem(OPEN_KEY) === '1'),
  )

  useEffect(() => {
    if (debugEnabled) localStorage.setItem(OPEN_KEY, debugOpen ? '1' : '0')
  }, [debugOpen])

  // ` opens and closes the simulator.
  useEffect(() => {
    if (!debugEnabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) setDebugOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Live: the lesson opens on its first step. The tutor greets over it, and
  // start_lesson keeps it there.
  const screen =
    live && snapshot.screen.phase === 'awake' ? { ...snapshot.screen, phase: 'lesson' as const } : snapshot.screen

  const player = () => (
    status.kind === 'ready' ? (
      <LessonPlayer
        session={screen}
        pressed={snapshot.pressed}
        caption={snapshot.caption}
        onStart={() => (live ? live.tapStart() : store.tapStart())}
      />
    ) : (
      <LiveNotice status={status} />
    )
  )

  // The app: the lesson at the real window size.
  const app = (
    <div className="@container relative h-dvh overflow-hidden">
      {player()}
      {debugEnabled && (
        <button
          type="button"
          onClick={() => setDebugOpen(true)}
          title="Voice AI simulator (`)"
          aria-label="Open the voice AI simulator"
          className="absolute top-[10px] right-[10px] z-50 flex size-[32px] cursor-pointer items-center justify-center rounded-full bg-zinc-900/60 text-white opacity-40 hover:opacity-100 focus-visible:opacity-100"
        >
          <Bug className="size-[16px]" />
        </button>
      )}
    </div>
  )

  return (
    <>
      {!debugOpen && app}
      {debugEnabled && (
        <Suspense fallback={debugOpen ? app : null}>
          <DebugView
            open={debugOpen}
            store={store}
            snapshot={snapshot}
            render={player}
            onClose={() => setDebugOpen(false)}
          />
        </Suspense>
      )}
    </>
  )
}
