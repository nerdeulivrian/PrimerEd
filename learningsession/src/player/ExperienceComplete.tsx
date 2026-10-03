import { BookOpen, CircleCheck } from 'lucide-react'
import type { LessonInfo } from '../lesson/types'
import type { Summary, Tier } from '../session/state'
import { tierStyle } from './styles'

const tierMessage: Record<Tier, (topic: string) => string> = {
  green: (t) => `Great work! You've got a solid grip on ${t}.`,
  orange: (t) => `Nice effort! A quick review and you'll have ${t} down.`,
  red: () => "Keep going! Try this experience again to strengthen what you've learned.",
}

/** "The Solar System" reads as "the Solar System" mid-sentence. */
function topicOf(title: string) {
  return title.replace(/^The /, 'the ')
}

function ScoreRing({ score, total, tier }: { score: number; total: number; tier: Tier }) {
  const style = tierStyle[tier]
  const r = 46
  const circumference = 2 * Math.PI * r
  const fraction = total === 0 ? 1 : score / total
  return (
    <div className="relative size-[116px] @tab:size-[173px] @desk:size-[260px]">
      {/* Ring thickness is 8% of the diameter, filling clockwise from the top. */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-white" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className={`${style.stroke} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2px]">
        <span className={`text-[28px] font-black whitespace-nowrap @tab:text-[40px] @desk:text-[56px] ${style.text}`}>
          {score}/{total}
        </span>
        <span className="text-[10px] font-extrabold tracking-[1.5px] text-text-secondary @desk:text-[13px]">
          CORRECT
        </span>
      </div>
    </div>
  )
}

function Tile({ value, label, tier }: { value: string | number; label: string; tier: Tier }) {
  const style = tierStyle[tier]
  return (
    <div
      className={`flex flex-1 flex-col items-start gap-[2px] rounded-[12px] bg-bg px-[12px] py-[10px] outline-1 -outline-offset-[0.5px] @tab:px-[13px] @desk:rounded-[16px] @desk:px-[18px] @desk:py-[14px] ${style.outline}`}
    >
      <span className={`text-[20px] font-black whitespace-nowrap @desk:text-[25px] ${style.text}`}>{value}</span>
      <span className={`text-[10px] font-extrabold tracking-[1px] whitespace-nowrap @desk:text-[12px] ${style.text}`}>
        {label}
      </span>
    </div>
  )
}

export function ExperienceComplete({ info, summary }: { info: LessonInfo; summary: Summary }) {
  const style = tierStyle[summary.tier]
  return (
    <div className="flex w-full flex-col items-start gap-[16px] @tab:flex-row @tab:items-stretch @tab:gap-[29px] @desk:w-[940px] @desk:gap-[48px]">
      <div
        className={`flex h-[150px] w-full shrink-0 items-center justify-center rounded-[16px] @tab:h-auto @tab:w-[230px] @tab:rounded-[17px] @desk:w-[380px] @desk:rounded-[24px] ${style.card}`}
      >
        <ScoreRing score={summary.score} total={summary.total} tier={summary.tier} />
      </div>

      <div className="flex w-full flex-col gap-[14px] @tab:min-w-0 @tab:flex-1 @tab:gap-[17px] @desk:gap-[20px]">
        <div className="flex w-full flex-col items-start gap-[8px] @tab:flex-row @tab:items-center @tab:gap-[9px] @desk:gap-[12px]">
          <div
            className={`flex items-center gap-[6px] rounded-full px-[12px] py-[6px] @tab:gap-[4px] @tab:px-[9px] @tab:py-[4px] @desk:gap-[6px] @desk:px-[12px] @desk:py-[6px] ${style.bg}`}
          >
            <BookOpen className="size-[12px] text-white @tab:size-[10px] @desk:size-[14px]" strokeWidth={2.5} />
            <span className="text-[10px] font-extrabold tracking-[1px] whitespace-nowrap text-white uppercase @desk:text-[12px]">
              {info.mode}
            </span>
          </div>
          <span className={`text-[12px] font-bold @tab:flex-1 @tab:text-[10px] @desk:text-[14px] ${style.text}`}>
            {info.title}
          </span>
        </div>

        <div className="flex w-full flex-col gap-[8px] @tab:gap-[9px] @desk:gap-[12px]">
          <h1 className="text-[26px] font-black text-text @tab:text-[29px] @desk:text-[40px]">Experience Complete</h1>
          <p className="text-[14px]/[20px] font-medium text-text @tab:text-[13px]/[18px] @desk:text-[18px]/[25px]">
            {tierMessage[summary.tier](topicOf(info.title))}
          </p>
        </div>

        <div className="flex w-full gap-[8px] @tab:gap-[9px] @desk:gap-[12px]">
          <Tile value={summary.score} label="CORRECT" tier={summary.tier} />
          <Tile value={summary.missed.length} label="MISSED" tier={summary.tier} />
          <Tile value={summary.time} label="TIME" tier={summary.tier} />
        </div>

        {info.learning_objectives.length > 0 && (
          <div className="flex w-full flex-col gap-[12px] @tab:gap-[9px] @desk:gap-[12px]">
            <span className={`text-[11px] font-extrabold tracking-[1.5px] @tab:text-[10px] @desk:text-[12px] ${style.text}`}>
              WHAT YOU LEARNED
            </span>
            {info.learning_objectives.map((objective) => (
              <div key={objective} className="flex w-full items-center gap-[10px] @tab:gap-[7px] @desk:gap-[10px]">
                <CircleCheck className={`size-[18px] shrink-0 @tab:size-[16px] @desk:size-[22px] ${style.text}`} strokeWidth={2.25} />
                <span className="min-w-0 flex-1 text-[14px] font-semibold text-text @tab:text-[12px] @desk:text-[16px]">
                  {objective}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
