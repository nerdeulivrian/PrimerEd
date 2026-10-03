import type { TrueFalseStep } from '../lesson/types'
import { QuestionHeader } from './QuestionHeader'
import { optionCard, optionState } from './styles'

interface Props {
  step: TrueFalseStep
  selected?: string
  graded?: { correct: boolean }
}

const cards = [
  { id: 'true', label: 'True' },
  { id: 'false', label: 'False' },
]

export function TrueFalse({ step, selected, graded }: Props) {
  return (
    <div className="flex w-full flex-col items-center gap-[20px]">
      <QuestionHeader type={step.type} question={step.question} />
      <div className="flex h-[210px] w-full flex-col gap-[15px] @tab:h-[180px] @tab:flex-row">
        {cards.map((card) => {
          const state = optionState(card.id, selected, String(step.answer), graded)
          return (
            <div
              key={card.id}
              className={`flex flex-1 items-center justify-center rounded-[7px] p-[10px] outline-1 @tab:rounded-[10px] @tab:p-[16px] ${optionCard[state]}`}
            >
              <span className="text-[35px] font-bold @tab:text-[53px]">{card.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
