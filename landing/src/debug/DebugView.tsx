import { Pause, Play, RotateCcw, X } from 'lucide-react'
import { useState, useSyncExternalStore, type ReactNode } from 'react'
import type { Demo } from '../home/demo'
import { designedScreens } from '../home/screens'
import type { HomeStore } from '../home/store'
import type { HomeState } from '../home/types'
import { DeviceStage } from './DeviceStage'
import { devices } from './devices'

type Frame = 'fill' | 'mobile' | 'tablet' | 'desktop' | 'all'

const frames: { id: Frame; label: string }[] = [
  { id: 'fill', label: 'Fill' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'desktop', label: 'Desktop' },
  { id: 'all', label: 'All' },
]

const FRAME_KEY = 'primered-landing:frame'

interface Props {
  store: HomeStore
  demo: Demo
  state: HomeState
  render: () => ReactNode
  onClose: () => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[8px]">
      <h3 className="text-[11px] font-extrabold tracking-[1px] text-zinc-400 uppercase">{title}</h3>
      {children}
    </section>
  )
}

const chip = (active: boolean) =>
  `cursor-pointer rounded-[8px] px-[10px] py-[6px] text-[13px] font-bold transition-colors ${
    active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
  }`

/**
 * Debug only: the app in device frames, plus a panel to jump to any designed
 * screen and control the scripted voice AI.
 */
export function DebugView({ store, demo, state, render, onClose }: Props) {
  const [frame, setFrameState] = useState<Frame>(() => (localStorage.getItem(FRAME_KEY) as Frame) || 'all')
  const [speed, setSpeedState] = useState(store.speed)
  const [screen, setScreen] = useState<string | null>(null)
  useSyncExternalStore(demo.subscribe, () => `${demo.running}${demo.isPaused}`)

  const setFrame = (f: Frame) => {
    setFrameState(f)
    localStorage.setItem(FRAME_KEY, f)
  }
  const setSpeed = (s: number) => {
    store.setSpeed(s)
    setSpeedState(s)
  }
  const jump = (id: string) => {
    demo.cancel()
    demo.setPaused(false)
    store.load(designedScreens.find((s) => s.id === id)!.state())
    setScreen(id)
  }
  const restart = () => {
    demo.cancel()
    demo.setPaused(false)
    store.reset()
    setScreen(null)
  }

  const shown = frame === 'all' ? devices : devices.filter((d) => d.id === frame)

  return (
    <div className="flex h-dvh w-full bg-zinc-200 font-main">
      <div className="relative min-w-0 flex-1">
        {frame === 'fill' ? <div className="@container h-full">{render()}</div> : <DeviceStage shown={shown} render={render} />}
      </div>

      <aside className="flex w-[300px] shrink-0 flex-col gap-[20px] overflow-y-auto border-l border-zinc-300 bg-white p-[18px] text-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold">Landing · debug</h2>
          <button
            type="button"
            onClick={onClose}
            title="Close (`)"
            className="cursor-pointer rounded-[8px] p-[6px] text-zinc-500 hover:bg-zinc-100"
          >
            <X className="size-[16px]" />
          </button>
        </div>

        <Section title="Device">
          <div className="flex flex-wrap gap-[6px]">
            {frames.map((f) => (
              <button key={f.id} type="button" className={chip(frame === f.id)} onClick={() => setFrame(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Scripted voice AI">
          <p className="text-[12px] leading-[17px] font-semibold text-zinc-500">
            Tap the orb to play the whole flow: conversation, generating, Experience tab, level path. Stop and Start over
            work too.
          </p>
          <div className="flex flex-wrap gap-[6px]">
            <button type="button" className={`${chip(false)} flex items-center gap-[6px]`} onClick={restart}>
              <RotateCcw className="size-[14px]" /> Welcome
            </button>
            <button
              type="button"
              disabled={!demo.running}
              className={`${chip(false)} flex items-center gap-[6px] disabled:cursor-default disabled:opacity-40`}
              onClick={() => demo.setPaused(!demo.isPaused)}
            >
              {demo.isPaused ? <Play className="size-[14px]" /> : <Pause className="size-[14px]" />}
              {demo.isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
          <div className="flex items-center gap-[6px]">
            <span className="text-[12px] font-bold text-zinc-500">Speed</span>
            {[1, 2, 4].map((s) => (
              <button key={s} type="button" className={chip(speed === s)} onClick={() => setSpeed(s)}>
                {s}×
              </button>
            ))}
          </div>
          <p className="text-[12px] font-semibold text-zinc-500">
            {demo.running ? (demo.isPaused ? 'Paused' : 'Playing') : 'Idle'} · {state.phase} · {state.view}
          </p>
        </Section>

        <Section title="Designed screens">
          <div className="flex flex-col gap-[4px]">
            {designedScreens.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => jump(s.id)}
                className={`flex cursor-pointer items-center gap-[10px] rounded-[8px] px-[10px] py-[7px] text-left text-[13px] font-bold transition-colors ${
                  screen === s.id ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'
                }`}
              >
                <span className="w-[28px] text-zinc-400">{s.id}</span>
                {s.label}
              </button>
            ))}
          </div>
        </Section>

        <p className="mt-auto text-[11px] leading-[16px] font-semibold text-zinc-400">
          ` toggles this panel. In a build it's hidden unless the URL has ?debug.
        </p>
      </aside>
    </div>
  )
}
