import { Bug } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Demo, fullDemo, greetingDemo } from './home/demo'
import { designedScreens } from './home/screens'
import { HomeStore, useHome } from './home/store'
import { API_URL } from './live/api'
import { Live } from './live/live'
import { Home } from './ui/Home'

const params = new URLSearchParams(window.location.search)

// With a backend (VITE_API_URL), the orb starts the real voice session.
// Without one, or with `?demo`, a script plays the voice AI instead.
const live = API_URL && !params.has('demo') ? new Live(new HomeStore([])) : null
const store = live ? live.store : new HomeStore()
const demo = new Demo(store)
live?.load()

// The debug view is always on in dev, and in any build with `?debug` in the
// URL. It's a separate chunk, loaded only when it's on.
const debugEnabled = import.meta.env.DEV || params.has('debug')
const DebugView = lazy(() => import('./debug/DebugView').then((m) => ({ default: m.DebugView })))
const OPEN_KEY = 'primered-landing:debug-open'

// Console access, e.g. primered.store.say('Hello') or primered.show('3.5')
const show = (id: string) => {
  demo.cancel()
  const screen = designedScreens.find((s) => s.id === id)
  if (screen) store.load(screen.state())
}
if (debugEnabled) Object.assign(window, { primered: { store, demo, live, show } })

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

const start = () => {
  store.tapStart()
  if (live) live.start()
  else demo.play(fullDemo)
}
const stop = () => {
  demo.cancel()
  live?.end()
  store.stop()
}
const startOver = () => {
  store.startOver()
  if (live) live.end().then(() => live.start())
  else demo.play(greetingDemo)
}

export default function App() {
  const state = useHome(store)
  const [debugOpen, setDebugOpen] = useState(
    () => debugEnabled && (params.has('debug') || localStorage.getItem(OPEN_KEY) === '1'),
  )

  useEffect(() => {
    if (debugEnabled) localStorage.setItem(OPEN_KEY, debugOpen ? '1' : '0')
  }, [debugOpen])

  // ` opens and closes the debug view.
  useEffect(() => {
    if (!debugEnabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) setDebugOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const home = () => <Home state={state} onStart={start} onStop={stop} onStartOver={startOver} />

  // The app: the landing flow at the real window size.
  const app = (
    <div className="@container relative h-dvh overflow-hidden">
      {home()}
      {debugEnabled && (
        <button
          type="button"
          onClick={() => setDebugOpen(true)}
          title="Debug view (`)"
          aria-label="Open the debug view"
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
      {debugEnabled && debugOpen && (
        <Suspense fallback={app}>
          <DebugView store={store} demo={demo} state={state} render={home} onClose={() => setDebugOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
