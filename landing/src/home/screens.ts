import { algebraBasics, lines, solarSystem, status } from './data'
import { initialState } from './store'
import type { Generation, HomeState, Turn } from './types'

/** The designed screens from designLandingScreen.pen, as states the debug panel can jump to. */
export interface DesignedScreen {
  id: string
  label: string
  state: () => HomeState
}

let id = 10_000
const ai = (text: string): Turn => ({ id: id++, kind: 'ai', chunks: [text], animate: false })
const you = (text: string): Turn => ({ id: id++, kind: 'learner', text, animate: false })

const conversation = (): Turn[] => [
  ai(lines.greeting),
  you(lines.pick),
  ai(lines.level),
  you(lines.levelAnswer),
  ai(lines.plan),
  you(lines.agree),
  ai(lines.making),
]

const generation = (patch: Partial<Generation> = {}): Generation => ({
  title: algebraBasics.title,
  focus: 'from variables to simple equations',
  active: 4,
  lessons: 5,
  pictures: 24,
  picturesDone: 24,
  questions: 15,
  ...patch,
})

const live = (patch: Partial<HomeState>): HomeState => ({ ...initialState(), phase: 'live', ...patch })

const ready = (): HomeState =>
  live({
    thread: [...conversation(), { id: id++, kind: 'stepper' }, ai(lines.ready)],
    generation: generation(),
    experiences: [solarSystem, algebraBasics],
    shell: true,
    badge: true,
  })

const experienceTab = (): HomeState => ({
  ...ready(),
  view: 'experience',
  badge: false,
  caption: { id: id++, chunks: [lines.experienceTab], animate: false },
  status: status.opening(algebraBasics.title),
})

const levelPath = (): HomeState => ({
  ...ready(),
  view: 'path',
  openId: algebraBasics.id,
  badge: false,
  caption: { id: id++, chunks: [lines.path], animate: false },
})

const stopped = (s: HomeState): HomeState => ({ ...s, phase: 'stopped', caption: null, speaking: false })

export const designedScreens: DesignedScreen[] = [
  { id: '1', label: 'Welcome', state: initialState },
  { id: '2', label: 'Conversation', state: () => live({ thread: conversation(), speaking: true, status: status.speaking }) },
  {
    id: '3',
    label: 'Generating',
    state: () =>
      live({
        thread: [...conversation(), { id: id++, kind: 'stepper' }],
        generation: generation({ active: 1, picturesDone: 9 }),
      }),
  },
  { id: '3.5', label: 'Ready + panel', state: ready },
  { id: '4', label: 'Experience tab', state: experienceTab },
  { id: '5', label: 'Level path', state: levelPath },
  {
    id: '6a',
    label: 'Stopped · conversation',
    state: () => {
      const s = ready()
      return stopped({ ...s, thread: [...s.thread, { id: id++, kind: 'stopped' }] })
    },
  },
  { id: '6b', label: 'Stopped · Experience', state: () => stopped(experienceTab()) },
  { id: '6c', label: 'Stopped · level path', state: () => stopped(levelPath()) },
]
