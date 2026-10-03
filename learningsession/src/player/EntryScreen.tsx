import type { LessonInfo } from '../lesson/types'

interface Props {
  info: LessonInfo
  awake: boolean
  onStart: () => void
}

/**
 * Placeholder: the Duolingo-style lesson path isn't designed yet.
 * START is the only tap in the whole lesson; it wakes the voice AI.
 */
export function EntryScreen({ info, awake, onStart }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[24px] px-[15px] text-center">
      <span className="rounded-full bg-primary px-[12px] py-[6px] text-[12px] font-extrabold tracking-[1px] text-white uppercase">
        {info.mode}
      </span>
      <h1 className="text-[26px] font-black text-text @tab:text-[40px]">{info.title}</h1>
      {awake ? (
        <p className="animate-pulse text-[16px] font-bold text-text-secondary">Your tutor is getting ready…</p>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="h-[50px] w-[150px] cursor-pointer rounded-[10px] bg-primary shadow-[0_5px_0_var(--color-primary-dark)] active:translate-y-[5px] active:shadow-none"
        >
          <span className="text-[16px] font-[950] text-white">START</span>
        </button>
      )}
    </div>
  )
}
