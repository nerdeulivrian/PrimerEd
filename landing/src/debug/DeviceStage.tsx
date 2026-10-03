import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Device } from './devices'

const GAP = 32
const PAD = 28
const LABEL = 26

/**
 * Shows the app in device-sized frames, scaled down together to fit. Each
 * frame is its own `@container`, so it lays out for its own width.
 */
export function DeviceStage({ shown, render }: { shown: Device[]; render: () => ReactNode }) {
  const stage = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const totalWidth = shown.reduce((sum, d) => sum + d.width, 0) + GAP * (shown.length - 1)
  const tallest = Math.max(...shown.map((d) => d.height))
  const scale = Math.min(1, (size.width - PAD * 2) / totalWidth, (size.height - PAD * 2 - LABEL) / tallest)

  return (
    <div ref={stage} className="flex h-full w-full items-center justify-center overflow-hidden bg-zinc-200">
      {size.width > 0 && (
        <div className="flex items-start" style={{ gap: GAP * scale }}>
          {shown.map((d) => (
            <div key={d.id} className="flex flex-col items-center gap-[8px]">
              <span className="text-[12px] font-bold text-zinc-500">
                {d.label} · {Math.round(scale * 100)}%
              </span>
              <div
                className="overflow-hidden rounded-[18px] bg-white shadow-[0_10px_40px_#0000002E]"
                style={{ width: d.width * scale, height: d.height * scale }}
              >
                <div
                  className="@container origin-top-left"
                  style={{ width: d.width, height: d.height, transform: `scale(${scale})` }}
                >
                  {render()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
