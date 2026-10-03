import type { Experience } from '../home/types'

function NewTag({ className = '' }: { className?: string }) {
  return (
    <span
      className={`w-fit rounded-[10px] bg-primary px-[8px] py-[2px] text-[12px] font-extrabold tracking-[0.5px] text-white @desk:px-[10px] @desk:py-[4px] ${className}`}
    >
      NEW
    </span>
  )
}

function Card({ experience: e, number }: { experience: Experience; number: number }) {
  // The new experience (the one the AI is opening) is outlined in orange.
  const frame = e.isNew
    ? 'outline-[2.5px] -outline-offset-[1.25px] outline-primary shadow-[0_12px_32px_#FF7A2F33]'
    : 'outline-2 -outline-offset-1 outline-border shadow-[0_4px_0_var(--color-border)]'
  return (
    <article
      className={`flex h-[128px] w-full shrink-0 overflow-hidden rounded-[22px] bg-bg outline-solid ${frame} @desk:h-auto @desk:w-[328px] @desk:flex-col`}
    >
      <div className="relative size-[128px] shrink-0 @desk:h-[184px] @desk:w-full">
        <img src={e.thumbnail} alt="" className="size-full object-cover" draggable={false} />
        <span className="absolute top-[10px] left-[10px] flex size-[28px] items-center justify-center rounded-full bg-bg text-[14px] font-extrabold text-text shadow-[0_2px_8px_#0000001F] @desk:top-[16px] @desk:left-[16px] @desk:size-[36px] @desk:text-[16px]">
          {number}
        </span>
        {e.isNew && <NewTag className="absolute top-[20px] right-[20px] hidden @desk:block" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-[5px] px-[16px] pt-[10px] pb-[12px] @desk:flex-none @desk:gap-[10px] @desk:px-[20px] @desk:pt-[18px] @desk:pb-[22px]">
        {e.isNew && <NewTag className="@desk:hidden" />}
        <h2 className="truncate text-[19px] font-extrabold text-text @desk:text-[21px]">{e.title}</h2>
        <p className="truncate text-[14px] font-semibold text-text-secondary @desk:text-[15px]">
          {e.levels.length} levels · {e.subject}
        </p>
        <div className="flex w-full items-center gap-[12px] pt-[4px]">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={e.levels.length}
            aria-valuenow={e.done}
            className="h-[10px] flex-1 overflow-hidden rounded-[5px] bg-border"
          >
            <div className="h-full rounded-[5px] bg-correct" style={{ width: `${(e.done / e.levels.length) * 100}%` }} />
          </div>
          <span className="text-[14px] font-extrabold text-text-secondary">
            {e.done}/{e.levels.length}
          </span>
        </div>
      </div>
    </article>
  )
}

/** Screen 4: every saved experience as a card (number, thumbnail, title, progress). */
export function ExperienceTab({ experiences }: { experiences: Experience[] }) {
  return (
    <div className="no-scrollbar h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto flex w-full flex-col gap-[18px] px-[20px] pt-[28px] pb-[calc(var(--dock)+16px)] @tab:max-w-[640px] @desk:mx-0 @desk:max-w-none @desk:gap-[36px] @desk:pt-[72px] @desk:pr-[40px] @desk:pl-[72px]">
        <header className="flex flex-col gap-[4px] @desk:gap-[8px]">
          <h1 className="text-[30px] font-extrabold text-text @desk:text-[40px] @desk:tracking-[-0.5px]">Experience</h1>
          <p className="text-[15px] leading-[21px] font-semibold text-text-secondary @desk:text-[17px] @desk:leading-normal">
            Everything you've learned with PrimerEd, saved on this device.
          </p>
        </header>
        <div className="flex w-full flex-col gap-[16px] @desk:flex-row @desk:flex-wrap @desk:gap-[24px]">
          {experiences.map((e, i) => (
            <Card key={e.id} experience={e} number={i + 1} />
          ))}
        </div>
      </div>
    </div>
  )
}
