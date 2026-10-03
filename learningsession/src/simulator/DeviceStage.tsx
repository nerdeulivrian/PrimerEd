import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { breakpointFor, devices, type Device, type StageMode } from './devices'

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, size] as const
}

const LABEL_SPACE = 38
const GAP = 32

/** A device-sized `@container`, scaled down to fit. Breakpoints follow the frame, not the window. */
function Frame({ device, scale, children }: { device: Device; scale: number; children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-[6px]" style={{ width: device.width * scale }}>
      <div className="flex h-[32px] w-full flex-col items-center justify-end text-center text-[11px]/[14px] text-zinc-500">
        <span className="max-w-full truncate font-semibold text-zinc-700">
          {device.label}
          {device.label.toLowerCase() !== breakpointFor(device.width) && ` · ${breakpointFor(device.width)} layout`}
        </span>
        <span className="max-w-full truncate">
          {device.width}×{device.height}
          {scale < 1 && ` · ${Math.round(scale * 100)}%`}
        </span>
      </div>
      <div
        className="overflow-hidden rounded-[6px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)]"
        style={{ width: device.width * scale, height: device.height * scale }}
      >
        <div
          className="@container origin-top-left"
          style={{ width: device.width, height: device.height, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export function DeviceStage({ mode, render }: { mode: StageMode; render: () => ReactNode }) {
  const [ref, size] = useSize<HTMLDivElement>()
  const availW = Math.max(0, size.width)
  const availH = Math.max(0, size.height - LABEL_SPACE)

  let content: ReactNode = null
  if (size.width > 0) {
    if (mode === 'fill') {
      const device = { id: 'fill', label: 'Fill', width: Math.floor(availW), height: Math.floor(availH) }
      content = (
        <Frame device={device} scale={1}>
          {render()}
        </Frame>
      )
    } else if (mode === 'all') {
      const totalW = devices.reduce((sum, d) => sum + d.width, 0) + GAP * (devices.length - 1)
      const maxH = Math.max(...devices.map((d) => d.height))
      const scale = Math.min(1, availW / totalW, availH / maxH)
      content = (
        <div className="flex items-start" style={{ gap: GAP * scale }}>
          {devices.map((d) => (
            <Frame key={d.id} device={d} scale={scale}>
              {render()}
            </Frame>
          ))}
        </div>
      )
    } else {
      const device = devices.find((d) => d.id === mode) ?? devices[0]
      const scale = Math.min(1, availW / device.width, availH / device.height)
      content = (
        <Frame device={device} scale={scale}>
          {render()}
        </Frame>
      )
    }
  }

  return (
    <div ref={ref} className="flex min-h-0 min-w-0 flex-1 items-start justify-center overflow-hidden">
      {content}
    </div>
  )
}
