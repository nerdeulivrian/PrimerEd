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
  /** `wordMs` > 0 reveals the text word by word as it's spoken; 0 shows it at once. */
  | { id: number; kind: 'ai'; text: string; wordMs: number }
  | { id: number; kind: 'learner'; text: string; animate: boolean }
  /** Where the stepper sits in the thread. It draws `HomeState.generation`. */
  | { id: number; kind: 'stepper' }
  | { id: number; kind: 'stopped' }

export type View = 'home' | 'experience' | 'path'

export interface Caption {
  id: number
  text: string
  wordMs: number
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
