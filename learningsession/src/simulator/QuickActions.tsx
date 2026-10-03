import { useState, type ReactNode } from 'react'
import { currentStep, isStepDone } from '../session/engine'
import type { SessionState } from '../session/state'
import type { ToolCall } from '../session/tools'

interface Props {
  session: SessionState
  onCall: (call: ToolCall) => void
  onTapStart: () => void
}

export function CallButton({
  children,
  onClick,
  variant = 'default',
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'default' | 'primary' | 'learner'
}) {
  const styles = {
    default: 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50',
    primary: 'border-violet-600 bg-violet-600 text-white hover:bg-violet-700',
    learner: 'border-amber-500 bg-amber-50 text-amber-800 hover:bg-amber-100',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-md border px-2.5 py-1.5 font-mono text-[12px] font-medium transition-colors ${styles[variant]}`}
    >
      {children}
    </button>
  )
}

function SpokenAnswerInput({ stepId, onCall }: { stepId: string; onCall: Props['onCall'] }) {
  const [text, setText] = useState('')
  return (
    <form
      className="flex gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        onCall({ name: 'set_spoken_answer', args: { step_id: stepId, text } })
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What the learner said…"
        className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1 text-[12px] outline-none focus:border-violet-500"
      />
      <CallButton onClick={() => onCall({ name: 'set_spoken_answer', args: { step_id: stepId, text } })}>
        set_spoken_answer
      </CallButton>
    </form>
  )
}

/** Buttons for the calls that make sense right now, with arguments filled in. */
export function QuickActions({ session, onCall, onTapStart }: Props) {
  if (session.phase === 'entry') {
    return (
      <div className="flex flex-wrap gap-1.5">
        <CallButton variant="learner" onClick={onTapStart}>
          Learner taps START
        </CallButton>
      </div>
    )
  }
  if (session.phase === 'awake') {
    return (
      <div className="flex flex-wrap gap-1.5">
        <CallButton variant="primary" onClick={() => onCall({ name: 'start_lesson' })}>
          start_lesson()
        </CallButton>
      </div>
    )
  }
  if (session.phase === 'complete') {
    return (
      <div className="flex flex-wrap gap-1.5">
        <CallButton variant="primary" onClick={() => onCall({ name: 'exit_lesson' })}>
          exit_lesson()
        </CallButton>
      </div>
    )
  }

  const step = currentStep(session)
  const graded = Boolean(session.results[step.id])
  const done = isStepDone(session, step)
  const last = session.stepIndex === session.lesson.steps.length - 1
  const nextId = session.lesson.steps[session.stepIndex + 1]?.id

  return (
    <div className="flex flex-col gap-2.5">
      {!graded && step.type === 'multiple_choice' && (
        <div className="flex flex-wrap gap-1.5">
          {step.options.map((o) => (
            <CallButton key={o.id} onClick={() => onCall({ name: 'select_option', args: { step_id: step.id, option_id: o.id } })}>
              select_option({o.id})
            </CallButton>
          ))}
        </div>
      )}
      {!graded && step.type === 'true_false' && (
        <div className="flex flex-wrap gap-1.5">
          {['true', 'false'].map((v) => (
            <CallButton key={v} onClick={() => onCall({ name: 'select_option', args: { step_id: step.id, option_id: v } })}>
              select_option({v})
            </CallButton>
          ))}
        </div>
      )}
      {!graded && step.type === 'speak_answer' && <SpokenAnswerInput key={step.id} stepId={step.id} onCall={onCall} />}

      <div className="flex flex-wrap gap-1.5">
        {!graded && step.type !== 'slide' && (
          <CallButton variant="primary" onClick={() => onCall({ name: 'submit_answer', args: { step_id: step.id } })}>
            submit_answer({step.id})
          </CallButton>
        )}
        {done && !last && (
          <>
            <CallButton variant="primary" onClick={() => onCall({ name: 'next_step' })}>
              next_step()
            </CallButton>
            <CallButton onClick={() => onCall({ name: 'show_step', args: { step_id: nextId } })}>
              show_step({nextId})
            </CallButton>
          </>
        )}
        {done && last && (
          <CallButton variant="primary" onClick={() => onCall({ name: 'finish_lesson' })}>
            finish_lesson()
          </CallButton>
        )}
      </div>
    </div>
  )
}
