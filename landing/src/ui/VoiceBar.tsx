import { MicOff, RotateCcw } from 'lucide-react'
import type { CSSProperties } from 'react'

// Bar heights from the design (desktop; mobile is 3/4 of these).
const BARS = [8, 14, 24, 16, 30, 20, 12, 26, 18, 10, 6]
const BAR_MS = [820, 640, 900, 700, 980, 760, 610, 880, 720, 660, 940]

function Waveform({ speaking }: { speaking: boolean }) {
  return (
    <div aria-hidden className="flex h-[26px] items-center gap-[3px] @desk:h-[32px] @desk:gap-[4px]">
      {BARS.map((h, i) => (
        <div
          key={i}
          className="h-[calc(var(--h)*0.76px)] w-[3px] shrink-0 rounded-[2px] bg-linear-to-b from-[#FFA41B] to-[#F2652A] motion-safe:animate-wave @desk:h-[calc(var(--h)*1px)] @desk:w-[4px]"
          style={
            {
              '--h': h,
              '--wave-ms': `${speaking ? BAR_MS[i] * 0.55 : BAR_MS[i] * 1.4}ms`,
              '--wave-lo': speaking ? 0.35 : 0.55,
              '--wave-hi': speaking ? 1.05 : 0.8,
              animationDelay: `${-i * 130}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

interface Props {
  stopped: boolean
  status: string
  speaking: boolean
  onStop: () => void
  onStartOver: () => void
}

/**
 * The capsule at the bottom: waveform, what the AI is doing, and Stop.
 * After Stop it turns into the stopped bar with Start over.
 */
export function VoiceBar({ stopped, status, speaking, onStop, onStartOver }: Props) {
  const shell =
    'flex h-[60px] w-full items-center justify-between rounded-[30px] bg-bg outline-[1.5px] -outline-offset-[0.75px] outline-border outline-solid @desk:h-[72px] @desk:rounded-[36px]'

  if (stopped) {
    return (
      <div className={`${shell} pr-[8px] pl-[12px] shadow-[0_6px_20px_#0000000F] @desk:pr-[12px] @desk:pl-[28px]`}>
        <div className="flex min-w-0 items-center gap-[10px] @desk:gap-[14px]">
          <div className="flex size-[36px] shrink-0 items-center justify-center rounded-full bg-surface outline-[1.5px] -outline-offset-[0.75px] outline-border outline-solid @desk:size-[40px]">
            <MicOff className="size-[18px] text-text-secondary @desk:size-[20px]" />
          </div>
          <div className="flex min-w-0 flex-col gap-[1px]">
            <span className="text-[15px] font-extrabold text-text @desk:text-[17px]">Stopped</span>
            <span className="truncate text-[12px] font-semibold text-text-secondary @desk:text-[14px]">
              <span className="@desk:hidden">Your mic is off.</span>
              <span className="hidden @desk:inline">Start over whenever you're ready.</span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onStartOver}
          className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[22px] bg-primary px-[18px] py-[11px] text-white shadow-[0_4px_0_var(--color-primary-dark)] transition-[filter] outline-none [--press-depth:4px] hover:brightness-105 focus-visible:ring-4 focus-visible:ring-primary/30 active:translate-y-[4px] active:shadow-none @desk:gap-[10px] @desk:rounded-[26px] @desk:px-[24px] @desk:py-[14px]"
        >
          <RotateCcw className="size-[18px] @desk:size-[20px]" strokeWidth={2.25} />
          <span className="text-[15px] font-extrabold @desk:text-[17px]">Start over</span>
        </button>
      </div>
    )
  }

  return (
    <div className={`${shell} pr-[8px] pl-[18px] shadow-[0_8px_28px_#FF7A2F1F] @desk:pr-[12px] @desk:pl-[28px]`}>
      <div className="flex min-w-0 items-center gap-[12px] @desk:gap-[16px]">
        <Waveform speaking={speaking} />
        <span aria-live="polite" className="truncate text-[15px] font-semibold text-text-secondary @desk:text-[18px]">
          {status}
        </span>
      </div>
      <button
        type="button"
        onClick={onStop}
        className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[22px] bg-peach px-[16px] py-[11px] text-peach-text transition-colors outline-none hover:bg-[#FFE6C4] focus-visible:ring-4 focus-visible:ring-primary/30 active:bg-[#FFDDB0] @desk:gap-[10px] @desk:rounded-[26px] @desk:px-[22px] @desk:py-[14px]"
      >
        <span className="size-[10px] rounded-[3px] bg-peach-text @desk:size-[12px]" />
        <span className="text-[15px] font-extrabold @desk:text-[17px]">Stop</span>
      </button>
    </div>
  )
}
