import { Mic, PencilLine, type LucideIcon } from 'lucide-react'
import type { QuestionStep } from '../lesson/types'

const badges: Record<QuestionStep['type'], { label: string; Icon: LucideIcon }> = {
  multiple_choice: { label: 'MULTIPLE CHOICE', Icon: PencilLine },
  true_false: { label: 'TRUE OR FALSE', Icon: PencilLine },
  speak_answer: { label: 'SPEAK YOUR ANSWER', Icon: Mic },
}

export function QuestionHeader({ type, question }: { type: QuestionStep['type']; question: string }) {
  const { label, Icon } = badges[type]
  return (
    <div className="flex w-full flex-col items-center gap-[7px] @tab:gap-[10px]">
      <div className="flex items-center justify-center gap-[7px] @tab:gap-[10px]">
        <div className="flex size-[17px] items-center justify-center rounded-full bg-badge @tab:size-[26px]">
          <Icon className="size-[10px] text-white @tab:size-[15px]" strokeWidth={2.25} />
        </div>
        <span className="text-[10px] font-extrabold tracking-[1px] whitespace-nowrap text-badge @tab:text-[16px] @tab:tracking-[1.5px]">
          {label}
        </span>
      </div>
      <h1 className="w-full text-center text-[20px]/[24px] font-extrabold text-heading @tab:text-[30px]/[36px]">
        {question}
      </h1>
    </div>
  )
}
