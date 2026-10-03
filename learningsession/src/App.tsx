import { Bug } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { sampleLesson } from './lesson/sampleLesson'
import { LessonPlayer } from './player/LessonPlayer'
import { SessionStore, useSession } from './session/store'

const store = new SessionStore(sampleLesson)

// The voice AI simulator is a debug tool: always on in dev, and in any build
// with `?debug` in the URL. It's a separate chunk, loaded only when it's on.
const params = new URLSearchParams(window.location.search)
const debugEnabled = import.meta.env.DEV || params.has('debug')
const DebugView = lazy(() => import('./simulator/DebugView').then((m) => ({ default: m.DebugView })))
const OPEN_KEY = 'primered:debug-open'

// Console access, e.g. primer.call({ name: 'start_lesson' })
if (debugEnabled) Object.assign(window, { primer: store })

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

export default function App() {
  const snapshot = useSession(store)
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

  const player = () => (
    <LessonPlayer session={snapshot.screen} pressed={snapshot.pressed} onStart={() => store.tapStart()} />
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
