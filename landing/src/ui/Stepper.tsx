import type { Generation } from '../home/types'

type StepState = 'done' | 'active' | 'pending'

interface Step {
  title: string
  summary: string
  /** Visualizing shows how many pictures are drawn so far. */
  progress?: number
  /** The last step names the experience instead of a summary. */
  isFinal?: boolean
}

function steps(g: Generation): Step[] {
  const state = (i: number): StepState => (g.active > i ? 'done' : g.active === i ? 'active' : 'pending')
  return [
    {
      title: 'Crafting',
      summary: `${state(0) === 'done' ? 'Wrote' : 'Writing'} ${g.lessons} lessons on ${g.title}, ${g.focus}`,
    },
    {
      title: 'Visualizing',
      summary:
        state(1) === 'done'
          ? `Drew ${g.pictures} pictures for your slides`
          : state(1) === 'active'
            ? `Drawing pictures for your slides: ${g.picturesDone} of ${g.pictures} done`
            : 'Drawing pictures for your slides',
      progress: state(1) === 'active' ? g.picturesDone / g.pictures : undefined,
    },
    {
      title: 'Creating Assessment',
      summary:
        state(2) === 'done'
          ? `Wrote ${g.questions} questions to check what you've learned`
          : "Writing questions to check what you've learned",
    },
    { title: "It's now ready!", summary: g.title, isFinal: true },
  ]
}

const numberStyle: Record<StepState, string> = {
  done: 'bg-primary text-white',
  active: 'bg-peach text-peach-text outline-2 -outline-offset-1 outline-primary outline-solid motion-safe:animate-ring',
  pending: 'bg-bg text-text-muted outline-2 -outline-offset-1 outline-border outline-solid',
}

/**
 * Making a new experience, as the next item in the thread: numbered circles
 * joined by a dotted line, Gemini-style. Done steps are orange, the one in
 * progress is peach with a ring, the rest are grey.
 */
export function Stepper({ generation }: { generation: Generation }) {
  const list = steps(generation)
  return (
    <ol aria-label="Making your experience" className="flex w-full flex-col pt-[4px] motion-safe:animate-turn">
      {list.map((step, i) => {
        const state: StepState = generation.active > i ? 'done' : generation.active === i ? 'active' : 'pending'
        const last = i === list.length - 1
        const muted = state === 'pending'
        return (
          <li key={step.title} className="relative flex w-full gap-[14px] @desk:gap-[20px]">
            <div
              className={`flex size-[32px] shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold transition-colors duration-300 ${numberStyle[state]}`}
            >
              {i + 1}
            </div>
            <div
              className={`flex min-w-0 flex-1 flex-col gap-[4px] pt-[4px] @desk:gap-[6px] ${last ? '' : 'pb-[28px]'}`}
            >
              <span
                className={`text-[17px] font-extrabold transition-colors duration-300 @desk:text-[20px] ${muted ? 'text-text-muted' : 'text-text'}`}
              >
                {step.title}
              </span>
              {step.isFinal ? (
                <span
                  className={`text-[15px] leading-[22px] font-extrabold transition-colors duration-300 @desk:text-[17px] @desk:leading-[25px] ${muted ? 'text-text-muted' : 'text-text'}`}
                >
                  {step.summary}
                </span>
              ) : (
                <span
                  className={`text-[14px] leading-[20px] font-semibold italic transition-colors duration-300 @desk:text-[16px] @desk:leading-[23px] ${muted ? 'text-text-muted' : 'text-text-secondary'}`}
                >
                  {step.summary}
                </span>
              )}
              {step.progress !== undefined && (
                <div className="h-[6px] w-[200px] max-w-full overflow-hidden rounded-[3px] bg-peach @desk:w-[320px]">
                  <div
                    className="h-full rounded-[3px] bg-linear-to-r from-[#FFA41B] to-[#F2652A] transition-[width] duration-200 ease-out"
                    style={{ width: `${step.progress * 100}%` }}
                  />
                </div>
              )}
            </div>
            {!last && (
              // Dotted line: 2px dots every 6px, from under the circle to just above the next one.
              <div
                aria-hidden
                className="absolute top-[40px] bottom-[6px] left-[15px] w-[2px] transition-colors duration-300"
                style={{
                  backgroundImage: `radial-gradient(circle, ${state === 'done' ? '#FF9600' : '#E5E5E5'} 1px, transparent 1.2px)`,
                  backgroundSize: '2px 6px',
                  backgroundRepeat: 'repeat-y',
                }}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
