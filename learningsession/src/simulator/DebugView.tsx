import { useState, type ReactNode } from 'react'
import type { SessionStore, Snapshot } from '../session/store'
import { DeviceStage } from './DeviceStage'
import { devices, type StageMode } from './devices'
import { SimulatorPanel } from './SimulatorPanel'

const modes: { id: StageMode; label: string }[] = [
  ...devices.map((d) => ({ id: d.id, label: d.label })),
  { id: 'all', label: 'All three' },
  { id: 'fill', label: 'Fill (resize window)' },
]

/**
 * The debug view: the lesson in device frames on the left, the voice AI
 * simulator on the right. It stays mounted while closed (hidden), so a demo
 * session keeps playing in the real app behind it.
 * On narrow windows only the simulator shows; close it to see the lesson.
 */
export function DebugView({
  open,
  store,
  snapshot,
  render,
  onClose,
}: {
  open: boolean
  store: SessionStore
  snapshot: Snapshot
  render: () => ReactNode
  onClose: () => void
}) {
  const [mode, setMode] = useState<StageMode>('desktop')

  return (
    <div className={open ? 'flex h-dvh bg-zinc-100 font-sans text-zinc-900' : 'hidden'}>
      <main className="hidden min-w-0 flex-1 flex-col gap-3 p-4 md:flex">
        <div className="flex self-start rounded-lg border border-zinc-300 bg-white p-0.5">
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
        <DeviceStage mode={mode} render={render} />
      </main>
      <SimulatorPanel store={store} snapshot={snapshot} onClose={onClose} />
    </div>
  )
}
