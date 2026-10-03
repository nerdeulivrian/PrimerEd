import { MotionConfig } from 'motion/react'
import { useState } from 'react'
import { currentStep } from '../session/engine'
import type { SessionState } from '../session/state'
import type { Pressed } from '../session/store'
import { BottomSheet, ExitPanel, ProgressBar, type SheetContent } from './BottomArea'
import { EntryScreen } from './EntryScreen'
import { ExperienceComplete } from './ExperienceComplete'
import { MultipleChoice } from './MultipleChoice'
import { Slide } from './Slide'
import { SpeakAnswer } from './SpeakAnswer'
import { tierStyle, type Tone } from './styles'
import { TrueFalse } from './TrueFalse'

interface Props {
  session: SessionState
  /** The button the voice AI is pressing right now, if any. */
  pressed?: Pressed | null
  onStart: () => void
}

function StepBody({ session }: { session: SessionState }) {
  const step = currentStep(session)
  const response = session.responses[step.id]
  const graded = session.results[step.id]
  const choice = response?.kind === 'choice' ? response.value : undefined

  switch (step.type) {
    case 'slide':
      return <Slide step={step} />
    case 'multiple_choice':
      return <MultipleChoice step={step} selected={choice} graded={graded} />
    case 'true_false':
      return <TrueFalse step={step} selected={choice} graded={graded} />
    case 'speak_answer':
      return <SpeakAnswer step={step} value={response?.kind === 'text' ? response.value : ''} graded={graded} />
  }
}

/**
 * The lesson screen: a body with the bottom sheet (progress bar plus feedback
 * panel) laid over its lower edge. Nothing in here is clickable except START.
 * Must sit inside an `@container` element: breakpoints are container queries.
 */
export function LessonPlayer({ session, pressed, onStart }: Props) {
  const { lesson, phase } = session
  const step = phase === 'lesson' ? currentStep(session) : null
  const result = step ? session.results[step.id] : undefined
  const tone: Tone = result ? (result.correct ? 'correct' : 'incorrect') : 'normal'
  const fraction = (session.stepIndex + 1) / lesson.steps.length

  // The panel is up once a question is graded. After PROCEED, the last one is
  // kept (with the bar as it was) while it slides back down.
  const open: SheetContent | null =
    step && result && step.type !== 'slide'
      ? {
          key: step.id,
          correct: result.correct,
          explanation: result.correct ? step.feedback.correct : step.feedback.incorrect,
          tone,
          fraction,
        }
      : null
  const [shown, setShown] = useState<SheetContent | null>(null)
  const [closing, setClosing] = useState<SheetContent | null>(null)
  if (open?.key !== shown?.key) {
    const leaving = phase === 'lesson' || phase === 'complete'
    setClosing(shown && !open && leaving ? shown : null)
    setShown(open)
  }

  if (phase === 'entry' || phase === 'awake') {
    return (
      <div className="flex h-full w-full flex-col bg-bg font-main">
        <EntryScreen info={lesson.lesson} awake={phase === 'awake'} onStart={onStart} />
      </div>
    )
  }

  const summary = phase === 'complete' ? session.summary : null

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-bg font-main">
        {summary ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[15px] @tab:px-[70px] @tab:py-[20px] @desk:px-0">
              <div className="my-auto flex w-full animate-step-in justify-center py-[20px] @tab:py-0">
                <ExperienceComplete info={lesson.lesson} summary={summary} />
              </div>
            </div>
            <ProgressBar fraction={1} tone={tierStyle[summary.tier].bar} />
            <ExitPanel tier={summary.tier} pressed={pressed === 'exit'} />
          </>
        ) : (
          step && (
            <>
              {step.type === 'slide' ? (
                <div key={step.id} className="flex min-h-0 flex-1 animate-step-in flex-col">
                  <StepBody session={session} />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[15px] @tab:px-[70px] @tab:py-[20px] @desk:px-0">
                  <div key={step.id} className="my-auto flex w-full animate-step-in justify-center py-[20px] @tab:py-0">
                    <div className="w-full @desk:w-[940px]">
                      <StepBody session={session} />
                    </div>
                  </div>
                </div>
              )}
              {/* Room for the progress bar, which lives in the bottom sheet. */}
              <div className="h-[10px] shrink-0" />
            </>
          )
        )}

        {/* On Experience Complete the sheet only stays while the last panel drops. */}
        {(!summary || closing) && (
          <BottomSheet
            key="sheet"
            content={open ?? closing}
            open={open !== null}
            bar={{ fraction, tone }}
            pressed={pressed === 'proceed'}
            onClosed={() => setClosing(null)}
          />
        )}
      </div>
    </MotionConfig>
  )
}
