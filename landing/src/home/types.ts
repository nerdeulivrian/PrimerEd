export interface Level {
  title: string
  /** Difficulty rank, e.g. "Beginner". Levels 2–4 names aren't confirmed yet. */
  rank: string
}

/** A learning experience: a topic with up to 5 levels (learning sessions). */
export interface Experience {
  id: string
  title: string
  subject: string
  /** The longer title on the level path's banner. */
  headline: string
  thumbnail: string
  levels: Level[]
  /** Levels finished so far. */
  done: number
  /** Made in this session and not opened yet: shows the NEW tag. */
  isNew: boolean
}

/** Progress of making a new experience; drives the stepper in the thread. */
export interface Generation {
  title: string
  /** What the lessons cover, e.g. "from variables to simple equations". */
  focus: string
  /** The step in progress, 0–3. 4 = every step is done. */
  active: number
  lessons: number
  pictures: number
  picturesDone: number
  questions: number
}

export type Turn =
  /**
   * What the AI is saying, in the pieces its live transcript streamed in.
   * `animate` fades each piece in as it arrives; off for prepared screens.
   */
  | { id: number; kind: 'ai'; chunks: string[]; animate: boolean }
  | { id: number; kind: 'learner'; text: string; animate: boolean }
  /** Where the stepper sits in the thread. It draws `HomeState.generation`. */
  | { id: number; kind: 'stepper' }
  | { id: number; kind: 'stopped' }

export type View = 'home' | 'experience' | 'path'

export interface Caption {
  id: number
  chunks: string[]
  animate: boolean
}

export interface HomeState {
  /** welcome = before START; live = voice session on; stopped = after Stop. */
  phase: 'welcome' | 'live' | 'stopped'
  view: View
  thread: Turn[]
  generation: Generation | null
  /** The voice bar's label, e.g. "Listening…". */
  status: string
  /** The AI is talking: the waveform moves more. */
  speaking: boolean
  /** What the AI says when there's no thread on screen (Experience tab, level path). */
  caption: Caption | null
  experiences: Experience[]
  /** The experience whose level path is open. */
  openId: string | null
  /** Side panel (desktop) or tab bar (mobile, tablet). Shows once an experience is made. */
  shell: boolean
  /** NEW badge on the Experience tab. */
  badge: boolean
}
