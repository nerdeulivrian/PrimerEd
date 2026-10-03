import { Square } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Generation, Turn } from '../home/types'
import { SpokenText } from './SpokenText'
import { Stepper } from './Stepper'

function TurnView({ turn, generation }: { turn: Turn; generation: Generation | null }) {
  switch (turn.kind) {
    case 'ai':
      return (
        <p className="w-full text-[17px] leading-[26px] font-semibold text-text @desk:text-[20px] @desk:leading-[31px]">
          <SpokenText text={turn.text} wordMs={turn.wordMs} />
        </p>
      )
    case 'learner':
      return (
        <div className={`flex w-full justify-end ${turn.animate ? 'motion-safe:animate-turn' : ''}`}>
          <p className="max-w-[270px] rounded-[18px] bg-bubble px-[16px] py-[11px] text-[15px] leading-[21px] font-semibold text-text italic @tab:max-w-[75%] @desk:rounded-[22px] @desk:px-[22px] @desk:py-[14px] @desk:text-[18px] @desk:leading-normal">
            {turn.text}
          </p>
        </div>
      )
    case 'stepper':
      return generation ? <Stepper generation={generation} /> : null
    case 'stopped':
      return (
        <div className="flex w-full items-center gap-[16px] motion-safe:animate-turn">
          <div className="h-px flex-1 bg-border" />
          <div className="flex items-center gap-[8px] rounded-[14px] bg-surface px-[14px] py-[6px] text-text-secondary">
            <Square className="size-[14px]" strokeWidth={2} />
            <span className="text-[13px] font-bold whitespace-nowrap @desk:text-[14px]">You stopped the conversation</span>
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>
      )
  }
}

/**
 * The voice conversation as a thread: AI turns as plain text, the learner's
 * as grey italic bubbles on the right. It's pinned to the bottom, so the
 * newest line sits just above the voice bar and older turns scroll off the
 * top under a fade.
 */
export function Thread({ thread, generation }: { thread: Turn[]; generation: Generation | null }) {
  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const stick = useRef(true)
  // Scroll events from our own smooth scrolling don't count as the learner's.
  const autoUntil = useRef(0)

  // Follow the newest turn unless the learner has scrolled up to reread.
  useLayoutEffect(() => {
    const el = scroller.current
    const inner = content.current
    if (!el || !inner) return
    el.scrollTop = el.scrollHeight
    const ro = new ResizeObserver(() => {
      setOverflowing(el.scrollHeight > el.clientHeight + 1)
      if (!stick.current) return
      autoUntil.current = performance.now() + 700
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    })
    ro.observe(inner)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onScroll = () => {
      if (performance.now() < autoUntil.current) return
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="relative h-full">
      <div ref={scroller} className="no-scrollbar h-full overflow-y-auto overscroll-contain">
        <div className="flex min-h-full flex-col justify-end px-[20px] pt-[24px] pb-[24px] @desk:px-[40px] @desk:pt-[72px] @desk:pb-[40px]">
          <div
            ref={content}
            className="mx-auto flex w-full flex-col gap-[24px] @tab:max-w-[600px] @desk:max-w-[760px] @desk:gap-[36px]"
          >
            {thread.map((turn) => (
              <TurnView key={turn.id} turn={turn} generation={generation} />
            ))}
          </div>
        </div>
      </div>
      {/* Older turns fade out under the top edge. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-[72px] bg-linear-to-b from-bg to-bg/0 transition-opacity duration-500 @desk:h-[200px] @desk:bg-linear-to-b @desk:from-bg @desk:from-0% @desk:via-bg @desk:via-40% @desk:to-bg/0 ${overflowing ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
