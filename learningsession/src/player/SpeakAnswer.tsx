import type { SpeakAnswerStep } from '../lesson/types'
import { QuestionHeader } from './QuestionHeader'

interface Props {
  step: SpeakAnswerStep
  value: string
  graded?: { correct: boolean }
}

/**
 * Desktop/tablet show one letter cell per character of the answer; mobile
 * shows an open field. Both only display what the learner said.
 */
export function SpeakAnswer({ step, value, graded }: Props) {
  const cellCount = Math.max(step.answer.length, value.length)
  const tone = graded ? (graded.correct ? 'text-correct' : 'text-incorrect') : 'text-text'
  const border = graded ? (graded.correct ? 'border-correct' : 'border-incorrect') : 'border-field-border'

  return (
    <div className="flex w-full flex-col items-center gap-[20px] @tab:gap-[40px]">
      <QuestionHeader type={step.type} question={step.question} />

      <div className="flex w-full flex-col items-center">
        {/* Mobile: open field */}
        <div
          className={`flex h-[44px] w-full items-center justify-center gap-[8px] overflow-hidden rounded-[5px] border bg-bg px-[14px] @tab:hidden ${border}`}
        >
          {value ? (
            <span className={`text-[16px] font-semibold whitespace-nowrap ${tone}`}>{value}</span>
          ) : (
            <span className="text-[16px] font-semibold whitespace-nowrap text-text-muted">Speak your answer…</span>
          )}
        </div>

        {/* Tablet and desktop: letter cells */}
        <div className="hidden @tab:flex">
          {Array.from({ length: cellCount }, (_, i) => (
            <div
              key={i}
              className={`flex size-[60px] items-center justify-center border-x-[0.5px] border-y bg-bg first:rounded-l-[5px] first:border-l last:rounded-r-[5px] last:border-r ${border}`}
            >
              <span className={`text-[28px] font-extrabold uppercase ${tone}`}>{value[i] ?? ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
