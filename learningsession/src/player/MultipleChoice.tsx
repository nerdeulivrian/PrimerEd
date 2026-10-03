import type { MultipleChoiceStep } from '../lesson/types'
import { QuestionHeader } from './QuestionHeader'
import { optionBadge, optionCard, optionState } from './styles'

interface Props {
  step: MultipleChoiceStep
  selected?: string
  graded?: { correct: boolean }
}

export function MultipleChoice({ step, selected, graded }: Props) {
  return (
    <div className="flex w-full flex-col items-center gap-[20px]">
      <QuestionHeader type={step.type} question={step.question} />
      <div className="flex w-full flex-col gap-[15px]">
        {step.options.map((option) => {
          const state = optionState(option.id, selected, step.answer, graded)
          return (
            <div
              key={option.id}
              className={`flex w-full items-center rounded-[7px] p-[10px] outline-1 @tab:rounded-[10px] @tab:p-[16px] ${optionCard[state]}`}
            >
              <div
                className={`flex size-[20px] shrink-0 items-center justify-center rounded-[3px] outline-1 @tab:size-[30px] @tab:rounded-[5px] ${optionBadge[state]}`}
              >
                <span className="text-[10px] font-extrabold @tab:text-[16px]">{option.id}</span>
              </div>
              <p className="min-w-0 flex-1 px-[10px] text-[13px] font-bold @tab:px-[16px] @tab:text-[20px]">
                {option.text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
