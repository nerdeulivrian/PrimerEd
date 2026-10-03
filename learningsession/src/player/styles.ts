// Shared state styles. Breakpoint prefixes are container queries:
// base = mobile, @tab: = tablet (≥755px), @desk: = desktop (≥1025px).

export type OptionState = 'unselected' | 'selected' | 'correct' | 'incorrect'

/** Card colours for options and true/false cards. */
export const optionCard: Record<OptionState, string> = {
  unselected: 'bg-bg outline-border shadow-[0_4px_0_var(--color-border)] text-option',
  // Plays the press once, when the voice AI selects the option.
  selected: 'bg-primary-soft outline-primary shadow-[0_4px_0_var(--color-primary)] text-primary motion-safe:animate-press',
  correct: 'bg-correct-soft outline-correct shadow-[0_4px_0_var(--color-correct)] text-correct',
  incorrect: 'bg-incorrect-soft outline-incorrect shadow-[0_4px_0_var(--color-incorrect)] text-incorrect',
}

export const optionBadge: Record<OptionState, string> = {
  unselected: 'bg-bg outline-border text-option',
  selected: 'bg-primary-soft outline-primary text-primary',
  correct: 'bg-correct-soft outline-correct text-correct',
  incorrect: 'bg-incorrect-soft outline-incorrect text-incorrect',
}

/** How an option looks given the learner's choice and, once graded, the answer. */
export function optionState(id: string, selected: string | undefined, answer: string, graded?: object): OptionState {
  if (graded) {
    if (id === answer) return 'correct'
    if (id === selected) return 'incorrect'
    return 'unselected'
  }
  return id === selected ? 'selected' : 'unselected'
}

export type Tone = 'normal' | 'correct' | 'incorrect'

/** Experience Complete tier colours (KNOWLEDGE.md §6). */
export const tierStyle = {
  green: {
    card: 'bg-correct-soft',
    text: 'text-correct',
    bg: 'bg-correct',
    stroke: 'stroke-correct',
    outline: 'outline-correct shadow-[0_4px_0_var(--color-correct)]',
    bar: 'correct' as Tone,
    button: 'bg-correct shadow-[0_5px_0_var(--color-correct-dark)]',
  },
  orange: {
    card: 'bg-primary-tier',
    text: 'text-primary',
    bg: 'bg-primary',
    stroke: 'stroke-primary',
    outline: 'outline-primary shadow-[0_4px_0_var(--color-primary)]',
    bar: 'normal' as Tone,
    button: 'bg-primary shadow-[0_5px_0_var(--color-primary-shadow)]',
  },
  red: {
    card: 'bg-incorrect-panel',
    text: 'text-incorrect',
    bg: 'bg-incorrect',
    stroke: 'stroke-incorrect',
    outline: 'outline-incorrect shadow-[0_4px_0_var(--color-incorrect)]',
    bar: 'incorrect' as Tone,
    button: 'bg-incorrect shadow-[0_5px_0_var(--color-incorrect-dark)]',
  },
}
