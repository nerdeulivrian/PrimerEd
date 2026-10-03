import { animate, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { Tier } from '../session/state'
import type { Pressed } from '../session/store'
import { CheckMark, CrossMark } from './icons'
import { tierStyle, type Tone } from './styles'

const bar: Record<Tone, { track: string; fill: string; shine: string }> = {
  normal: { track: 'bg-border border-text-muted', fill: 'bg-primary', shine: 'bg-primary-shine' },
  correct: { track: 'bg-correct-track border-correct', fill: 'bg-correct-dark', shine: 'bg-correct' },
  incorrect: { track: 'bg-incorrect-track border-incorrect', fill: 'bg-incorrect-dark', shine: 'bg-incorrect' },
}

/** Fill = current step ÷ total steps. Orange normally, green/red while feedback shows. */
export function ProgressBar({ fraction, tone }: { fraction: number; tone: Tone }) {
  const style = bar[tone]
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(fraction * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`-mt-px flex h-[11px] w-full shrink-0 overflow-hidden border-t ${style.track}`}
    >
      <div
        className={`flex h-full items-start justify-end overflow-hidden rounded-r-full pt-[2px] pr-[4px] transition-[width] duration-500 ease-out ${style.fill}`}
        style={{ width: `${Math.min(100, Math.max(0, fraction * 100))}%` }}
      >
        <div className="flex gap-[3px]">
          <div className={`h-[2px] w-[5px] rounded-full ${style.shine}`} />
          <div className={`h-[2px] w-[15px] rounded-full ${style.shine}`} />
        </div>
      </div>
    </div>
  )
}

function ActionButton({ label, color, wide, pressed }: { label: string; color: string; wide?: boolean; pressed?: boolean }) {
  // Visual only: the voice AI "presses" it with a function call.
  return (
    <div
      aria-hidden
      className={`flex h-[40px] items-center justify-center rounded-[10px] [--press-depth:5px] @tab:h-[50px] @tab:w-[150px] ${wide ? 'w-full' : 'w-[130px]'} ${pressed ? 'motion-safe:animate-press' : ''} ${color}`}
    >
      <span className="text-[16px] font-[950] whitespace-nowrap text-white">{label}</span>
    </div>
  )
}

const feedbackTone = {
  correct: {
    panel: 'bg-correct-panel',
    text: 'text-correct-dark',
    button: 'bg-correct shadow-[0_5px_0_var(--color-correct-dark)]',
  },
  incorrect: {
    panel: 'bg-incorrect-panel',
    text: 'text-incorrect',
    button: 'bg-incorrect shadow-[0_5px_0_var(--color-incorrect-dark)]',
  },
}

/** Correct / incorrect panel with the explanation and a PROCEED button. */
export function FeedbackPanel({
  correct,
  explanation,
  pressed,
}: {
  correct: boolean
  explanation: string
  pressed?: boolean
}) {
  const tone = feedbackTone[correct ? 'correct' : 'incorrect']
  const Mark = correct ? CheckMark : CrossMark
  const markColor = correct ? 'text-correct-dark' : 'text-incorrect'

  return (
    <div role="status" className={`w-full ${tone.panel}`}>
      {/* Mobile: explanation row with PROCEED right under it; grows with longer text */}
      <div className="flex flex-col gap-[12px] px-[20px] pt-[15px] pb-[20px] @tab:hidden">
        <div className="flex items-center gap-[15px]">
          <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-bg">
            <Mark className={`size-[20px] ${markColor}`} />
          </div>
          <p className={`min-w-0 flex-1 text-[10px] font-medium ${tone.text}`}>{explanation}</p>
        </div>
        <ActionButton label="PROCEED" color={tone.button} wide pressed={pressed} />
      </div>

      {/* Tablet and desktop */}
      <div className="hidden h-[140px] @tab:flex @desk:px-[220px]">
        <div className="flex flex-1 items-center justify-between gap-[30px] overflow-hidden px-[40px] py-[20px]">
          <div className="flex size-[70px] shrink-0 items-center justify-center rounded-full bg-bg">
            <Mark className={`size-[50px] ${markColor}`} />
          </div>
          <p className={`min-w-0 flex-1 px-[20px] text-[20px] font-medium ${tone.text}`}>{explanation}</p>
          <ActionButton label="PROCEED" color={tone.button} pressed={pressed} />
        </div>
      </div>
    </div>
  )
}

const exitPanelHeight = 'h-[80px] @tab:h-[140px]'

/** Experience Complete keeps a white bottom panel holding a single EXIT button. */
export function ExitPanel({ tier, pressed }: { tier: Tier; pressed?: boolean }) {
  return (
    <div
      className={`flex w-full items-center justify-end bg-bg p-[20px] @tab:px-[40px] @tab:py-0 @desk:px-[260px] ${exitPanelHeight}`}
    >
      <ActionButton label="EXIT" color={tierStyle[tier].button} pressed={pressed} />
    </div>
  )
}

/** What the bottom sheet holds, plus the progress bar as it looked then. */
export type SheetContent = { key: string; tone: Tone; fraction: number } & (
  | { kind: 'feedback'; correct: boolean; explanation: string }
  | { kind: 'exit'; tier: Tier }
)

const RISE = { duration: 0.25, ease: [0.22, 1, 0.36, 1] } as const
const DROP = { duration: 0.2, ease: [0.4, 0, 1, 1] } as const

/** Room the body always leaves for the progress bar. */
const BAR_ROOM = 10

/**
 * The progress bar riding on top of a bottom panel (feedback or EXIT), laid
 * over the bottom of the screen. The panel slides up from below the bottom
 * edge and back down past it as one solid piece (a transform, so nothing gets
 * clipped), and the bar sits on its top edge the whole way.
 * When the panel changes (feedback -> EXIT), the old one goes all the way down
 * first, then the new one rises.
 *
 * It also renders a spacer at the end of the screen's flex column. With
 * `push`, the spacer grows with the part of the panel that's up, so the body
 * above (a question, Experience Complete) rises with the panel and stays
 * centred in the space left. Without it (slides), the panel covers the body.
 * A panel on its way down always belongs to the screen before, so the new
 * body doesn't follow it: it starts in its place and the old panel drops over it.
 */
export function BottomSheet({
  open,
  closing,
  bar,
  pressed,
  push,
  onClosed,
}: {
  /** The panel that should be up, if any. */
  open: SheetContent | null
  /** The previous panel, on its way down. Shown before `open`. */
  closing: SheetContent | null
  /** The bar when no panel is up. */
  bar: { fraction: number; tone: Tone }
  pressed?: Pressed | null
  /** Move the body up with the panel instead of covering it. */
  push: boolean
  onClosed: () => void
}) {
  const content = closing ?? open
  const up = !closing && open !== null
  const follow = push && !closing
  const reduceMotion = useReducedMotion()

  // How far up the panel is: 0 = below the bottom edge, 1 = all the way up.
  // Mounting with a panel (e.g. after switching device frames) starts it up.
  const progress = useMotionValue(content ? 1 : 0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const spacerRef = useRef<HTMLDivElement>(null)

  // Every frame, the panel's slide and the spacer's height come from the same
  // progress, written straight to the DOM. The panel's height is re-read each
  // time, so a panel that's already up when this mounts is measured too.
  useLayoutEffect(() => {
    const sheet = sheetRef.current
    const spacer = spacerRef.current
    if (!sheet || !spacer) return
    const update = () => {
      const p = progress.get()
      const height = sheet.offsetHeight
      sheet.style.transform = `translateY(${(1 - p) * 100}%)`
      spacer.style.height = `${BAR_ROOM + (follow ? p * height : 0)}px`
    }
    update()
    const unsubscribe = progress.on('change', update)
    const observer = new ResizeObserver(update)
    observer.observe(sheet)
    return () => {
      unsubscribe()
      observer.disconnect()
    }
  }, [progress, follow])

  const onClosedRef = useRef(onClosed)
  useLayoutEffect(() => {
    onClosedRef.current = onClosed
  })

  useEffect(() => {
    let live = true
    const controls = animate(progress, up ? 1 : 0, reduceMotion ? { duration: 0 } : up ? RISE : DROP)
    controls.finished.then(() => {
      if (live && !up) onClosedRef.current()
    })
    return () => {
      live = false
      controls.stop()
    }
  }, [up, progress, reduceMotion])

  return (
    <>
      <div ref={spacerRef} aria-hidden className="shrink-0" />
      <div ref={sheetRef} className="absolute inset-x-0 bottom-0 z-10">
        <div className="absolute inset-x-0 bottom-full">
          <ProgressBar fraction={content?.fraction ?? bar.fraction} tone={content?.tone ?? bar.tone} />
        </div>
        {content?.kind === 'feedback' && (
          <FeedbackPanel
            key={content.key}
            correct={content.correct}
            explanation={content.explanation}
            pressed={up && pressed === 'proceed'}
          />
        )}
        {content?.kind === 'exit' && <ExitPanel key={content.key} tier={content.tier} pressed={up && pressed === 'exit'} />}
      </div>
    </>
  )
}
