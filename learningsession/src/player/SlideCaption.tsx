import { AnimatePresence, motion } from 'motion/react'
import type { Caption } from '../session/store'

/**
 * What the tutor is saying over a slide, as video subtitles: white text on a
 * dark box per line, floating over the bottom of the image, just above the
 * progress bar. Each new piece fades in (as in landing's captions). Only the
 * last 2 lines show; a longer narration moves up line by line.
 */
export function SlideCaption({ caption }: { caption: Caption | null }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-[34px] z-10 flex justify-center px-[16px] @tab:bottom-[46px] @desk:bottom-[52px]"
    >
      {/* Exactly 2 lines tall, bottom-aligned, so older lines leave whole. */}
      <div className="flex max-h-[56px] max-w-[720px] flex-col justify-end overflow-hidden @desk:max-h-[64px]">
        <AnimatePresence mode="popLayout">
          {caption && (
            <motion.p
              key={caption.id}
              className="text-center text-[16px] leading-[28px] font-semibold text-white @desk:text-[20px] @desk:leading-[32px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <span className="bg-black/75 px-[8px] py-[2px] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                {caption.chunks.map((chunk, i) => (
                  <span key={i} className="motion-safe:animate-word">
                    {chunk}
                  </span>
                ))}
              </span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
