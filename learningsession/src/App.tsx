import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useState } from 'react'
import { sampleLesson } from './lesson/sampleLesson'
import { LessonPlayer } from './player/LessonPlayer'
import { SessionStore, useSession } from './session/store'
import { DeviceStage } from './simulator/DeviceStage'
import { devices, type StageMode } from './simulator/devices'
import { SimulatorPanel } from './simulator/SimulatorPanel'

const store = new SessionStore(sampleLesson)

// Dev console access, e.g. primer.call({ name: 'start_lesson' })
if (import.meta.env.DEV) Object.assign(window, { primer: store })

/** `?player` shows just the lesson at the real window size, without the simulator. */
const playerOnly = new URLSearchParams(window.location.search).has('player')

const modes: { id: StageMode; label: string }[] = [
  ...devices.map((d) => ({ id: d.id, label: d.label })),
  { id: 'all', label: 'All three' },
  { id: 'fill', label: 'Fill (resize window)' },
]

export default function App() {
  const snapshot = useSession(store)
  const [mode, setMode] = useState<StageMode>('desktop')
  const [panelOpen, setPanelOpen] = useState(true)

  if (playerOnly) {
    return (
      <div className="@container h-full">
        <LessonPlayer session={snapshot.screen} pressed={snapshot.pressed} onStart={() => store.tapStart()} />
      </div>
    )
  }

  return (
    <div className="flex h-full bg-zinc-100 font-sans text-zinc-900">
      <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex rounded-lg border border-zinc-300 bg-white p-0.5">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`cursor-pointer rounded-md px-3 py-1 text-[12px] font-semibold ${
                  mode === m.id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen(!panelOpen)}
            className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold text-zinc-600 hover:bg-zinc-200"
          >
            {panelOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
            {panelOpen ? 'Hide simulator' : 'Show simulator'}
          </button>
        </div>
        <DeviceStage
          mode={mode}
          render={() => <LessonPlayer session={snapshot.screen} pressed={snapshot.pressed} onStart={() => store.tapStart()} />}
        />
      </main>
      {panelOpen && <SimulatorPanel store={store} snapshot={snapshot} />}
    </div>
  )
}
