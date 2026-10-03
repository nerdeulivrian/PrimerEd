import { motion } from 'motion/react'
import type { Tier } from '../session/state'
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
      {/* Mobile: explanation strip above an 80px button row */}
      <div className="@tab:hidden">
        <div className="flex h-[50px] items-center gap-[15px] overflow-hidden px-[20px]">
          <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-bg">
            <Mark className={`size-[20px] ${markColor}`} />
          </div>
          <p className={`min-w-0 flex-1 text-[10px] font-medium ${tone.text}`}>{explanation}</p>
        </div>
        <div className="flex h-[80px] items-center p-[20px]">
          <ActionButton label="PROCEED" color={tone.button} wide pressed={pressed} />
        </div>
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

/** Experience Complete keeps a white bottom panel holding a single EXIT button. */
export function ExitPanel({ tier, pressed }: { tier: Tier; pressed?: boolean }) {
  return (
    <div className="flex h-[80px] w-full items-center justify-end bg-bg p-[20px] @tab:h-[140px] @tab:px-[40px] @tab:py-0 @desk:px-[260px]">
      <ActionButton label="EXIT" color={tierStyle[tier].button} pressed={pressed} />
    </div>
  )
}

/** One graded question's panel, plus the progress bar as it looked then. */
export interface SheetContent {
  key: string
  correct: boolean
  explanation: string
  tone: Tone
  fraction: number
}

const RISE = { duration: 0.25, ease: [0.22, 1, 0.36, 1] } as const
const DROP = { duration: 0.2, ease: [0.4, 0, 1, 1] } as const

/**
 * The progress bar riding on top of the feedback panel, laid over the bottom
 * of the screen. The panel slides up from below the bottom edge and back down
 * past it as one solid piece (a transform, so nothing gets clipped), and the
 * bar sits on its top edge the whole way. Nothing above it moves.
 */
export function BottomSheet({
  content,
  open,
  bar,
  pressed,
  onClosed,
}: {
  /** The panel to show: open, or on its way down. */
  content: SheetContent | null
  open: boolean
  /** The bar when no panel is up. */
  bar: { fraction: number; tone: Tone }
  pressed?: boolean
  onClosed: () => void
}) {
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-10"
      // Mounting mid-close (e.g. the switch to Experience Complete) still drops from the top.
      initial={!open && content ? { y: '0%' } : false}
      animate={{ y: open ? '0%' : '100%' }}
      transition={open ? RISE : DROP}
      onAnimationComplete={(target) => {
        if (typeof target === 'object' && !Array.isArray(target) && target.y === '100%') onClosed()
      }}
    >
      <div className="absolute inset-x-0 bottom-full">
        <ProgressBar fraction={content?.fraction ?? bar.fraction} tone={content?.tone ?? bar.tone} />
      </div>
      {content && (
        <FeedbackPanel key={content.key} correct={content.correct} explanation={content.explanation} pressed={pressed} />
      )}
    </motion.div>
  )
}
