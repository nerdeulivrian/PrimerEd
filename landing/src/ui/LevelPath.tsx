import { ChevronRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Experience } from '../home/types'

/** Node centres on the zigzag, from the design: mobile (350×392) and desktop (760×480). */
const mobile = { centres: [[54, 84], [98, 152], [122, 220], [98, 288], [54, 356]], label: 42 }
const desktop = { centres: [[320, 70], [396, 162], [432, 254], [396, 346], [320, 438]], label: 64 }

const polyline = (pts: number[][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ')

/** Positions an element's centre (or left-middle, for labels) at the point for each breakpoint. */
function at(i: number, dx = 0): CSSProperties {
  const [mx, my] = mobile.centres[i]
  const [deskX, deskY] = desktop.centres[i]
  const label = dx ? 1 : 0
  return {
    '--mx': `${mx + label * mobile.label}px`,
    '--my': `${my}px`,
    '--dx': `${deskX + label * desktop.label}px`,
    '--dy': `${deskY}px`,
  } as CSSProperties
}
const placed = 'absolute left-(--mx) top-(--my) @desk:left-(--dx) @desk:top-(--dy)'

type LevelState = 'done' | 'current' | 'locked'

/** Screen 5: the experience's levels on a Duolingo-style path. */
export function LevelPath({ experience: e }: { experience: Experience }) {
  const state = (i: number): LevelState => (i < e.done ? 'done' : i === e.done ? 'current' : 'locked')
  const current = Math.min(e.done, e.levels.length - 1)

  return (
    <div className="no-scrollbar h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto flex w-full flex-col gap-[16px] px-[20px] pt-[28px] pb-[calc(var(--dock)+16px)] @tab:max-w-[640px] @desk:max-w-[840px] @desk:gap-[64px] @desk:px-[40px] @desk:pt-[52px]">
        <header className="flex w-full flex-col gap-[12px] @desk:gap-[14px]">
          <nav aria-label="Breadcrumb" className="flex items-center gap-[8px] text-[14px] @desk:text-[15px]">
            <span className="font-bold text-text-secondary">Experience</span>
            <ChevronRight className="size-[16px] text-text-muted" strokeWidth={2} />
            <span className="font-extrabold text-text">{e.title}</span>
          </nav>
          <div className="flex w-full flex-col gap-[4px] rounded-[18px] bg-linear-to-r from-[#FFA41B] to-[#FF7A2F] px-[20px] py-[16px] shadow-[0_5px_0_var(--color-banner-shadow)] @desk:rounded-[20px] @desk:px-[28px] @desk:py-[20px]">
            <span className="text-[12px] font-extrabold tracking-[1px] text-white/85 uppercase @desk:text-[13px]">
              {e.subject} · {e.levels.length} levels
            </span>
            <h1 className="text-[19px] leading-[24px] font-extrabold text-white @desk:text-[24px] @desk:leading-normal">
              {e.headline}
            </h1>
          </div>
        </header>

        <ol
          aria-label="Levels"
          className="relative mx-auto h-[392px] w-full shrink-0 @desk:mx-0 @desk:h-[480px] @desk:w-[760px] @desk:self-center"
        >
          <svg aria-hidden className="absolute inset-0 overflow-visible @desk:hidden" width="100%" height="100%">
            <path d={polyline(mobile.centres)} fill="none" stroke="#E5E5E5" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg aria-hidden className="absolute inset-0 hidden overflow-visible @desk:block" width="100%" height="100%">
            <path d={polyline(desktop.centres)} fill="none" stroke="#E5E5E5" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {/* The current level: a soft halo and the START bubble above it. */}
          <div
            aria-hidden
            style={at(current)}
            className={`${placed} size-[76px] -translate-1/2 rounded-full bg-[#FF960014] outline-[3px] -outline-offset-[1.5px] outline-[#FF960040] outline-solid motion-safe:animate-breathe @desk:size-[104px]`}
          />
          <div
            style={at(current)}
            className={`${placed} z-10 flex -translate-x-1/2 -translate-y-[calc(100%+44px)] flex-col items-center @desk:-translate-y-[calc(100%+64px)]`}
          >
            <span className="rounded-[12px] bg-bg px-[14px] py-[8px] text-[14px] font-extrabold tracking-[0.5px] text-primary outline-2 -outline-offset-1 outline-border outline-solid @desk:px-[18px] @desk:py-[10px] @desk:text-[16px]">
              START
            </span>
            {/* Pointer: a turned square showing its two lower borders. */}
            <span className="-mt-[7px] size-[12px] rotate-45 border-r-2 border-b-2 border-border bg-bg" />
          </div>

          {e.levels.map((level, i) => {
            const s = state(i)
            const lit = s !== 'locked'
            return (
              <li key={i} aria-current={s === 'current' ? 'step' : undefined}>
                <div
                  style={at(i)}
                  className={`${placed} flex size-[56px] -translate-1/2 items-center justify-center rounded-full text-[22px] font-extrabold @desk:size-[76px] @desk:text-[28px] ${
                    lit
                      ? 'bg-primary text-white shadow-[0_6px_0_var(--color-primary-dark)]'
                      : 'bg-border text-text-muted shadow-[0_6px_0_var(--color-node-shadow)]'
                  }`}
                >
                  {i + 1}
                </div>
                <div style={at(i, 1)} className={`${placed} flex -translate-y-1/2 flex-col gap-[2px] whitespace-nowrap`}>
                  <span
                    className={`text-[11px] font-extrabold tracking-[1px] uppercase @desk:text-[12px] ${s === 'current' ? 'text-peach-text' : lit ? 'text-text-secondary' : 'text-text-muted'}`}
                  >
                    Level {i + 1} · {level.rank}
                  </span>
                  <span className={`text-[16px] font-extrabold @desk:text-[17px] ${lit ? 'text-text' : 'text-text-muted'}`}>
                    {level.title}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
