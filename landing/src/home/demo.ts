import { algebraBasics, lines, status } from './data'
import type { HomeStore } from './store'

/** How long one spoken word takes at 1× speed (about 200 words a minute). */
const WORD_MS = 300

class Cancelled extends Error {}

type Script = (run: DemoRun) => Promise<void>

/**
 * Plays the voice AI by script, since there's no Gemini connection yet.
 * One script runs at a time; starting another (or Stop) cancels it.
 */
export class Demo {
  private runId = 0
  private paused = false
  private listeners = new Set<() => void>()
  running = false
  private store: HomeStore

  constructor(store: HomeStore) {
    this.store = store
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit() {
    this.listeners.forEach((l) => l())
  }

  get isPaused() {
    return this.paused
  }

  setPaused(paused: boolean) {
    this.paused = paused
    this.emit()
  }

  play(script: Script) {
    const id = ++this.runId
    this.running = true
    this.emit()
    script(new DemoRun(this.store, () => this.runId !== id, () => this.paused))
      .catch((e) => {
        if (!(e instanceof Cancelled)) throw e
      })
      .finally(() => {
        if (this.runId === id) {
          this.running = false
          this.emit()
        }
      })
  }

  cancel() {
    this.runId++
    this.running = false
    this.emit()
  }
}

/** The calls a script can make. Every wait honours pause, speed and cancel. */
export class DemoRun {
  readonly store: HomeStore
  private cancelled: () => boolean
  private paused: () => boolean

  constructor(store: HomeStore, cancelled: () => boolean, paused: () => boolean) {
    this.store = store
    this.cancelled = cancelled
    this.paused = paused
  }

  /** Wait `ms` of demo time (shorter at higher speeds, frozen while paused). */
  async wait(ms: number) {
    let left = ms
    while (left > 0) {
      const tick = Math.min(left, 50)
      await new Promise((r) => setTimeout(r, tick))
      if (this.cancelled()) throw new Cancelled()
      if (!this.paused()) left -= tick * this.store.speed
    }
  }

  /**
   * The AI says a line. Its transcript streams in pieces of 1–4 words, each
   * arriving after roughly the time the previous one took to say.
   */
  async say(text: string, then = status.listening) {
    for (const piece of pieces(text)) {
      this.store.stream(piece)
      const words = piece.trim().split(' ').length
      await this.wait(words * WORD_MS * (0.7 + Math.random() * 0.6))
    }
    await this.wait(300)
    this.store.listen(then)
  }

  /** The learner talks for a while (Listening…), then their words show. */
  async hear(text: string) {
    await this.wait(900 + text.split(' ').length * 220)
    this.store.heard(text)
    await this.wait(700)
  }
}

/** Splits a line the way a live transcript arrives: a word or a few at a time. */
function pieces(text: string): string[] {
  const words = text.split(' ')
  const out: string[] = []
  for (let i = 0; i < words.length; ) {
    const n = 1 + Math.floor(Math.random() * 4)
    out.push(words.slice(i, i + n).join(' ') + (i + n < words.length ? ' ' : ''))
    i += n
  }
  return out
}

/** The whole designed flow: conversation → generating → ready → Experience tab → level path. */
export const fullDemo: Script = async (run) => {
  const { store } = run
  await run.wait(700)
  await run.say(lines.greeting)
  await run.hear(lines.pick)
  await run.say(lines.level)
  await run.hear(lines.levelAnswer)
  await run.say(lines.plan)
  await run.hear(lines.agree)
  await run.say(lines.making)
  await generate(run)
  await run.wait(400)
  store.experienceReady(algebraBasics)
  await run.wait(700)
  await run.say(lines.ready)
  await run.hear(lines.hop)
  store.openTab('experience')
  await run.wait(500)
  await run.say(lines.experienceTab, status.opening(algebraBasics.title))
  await run.wait(1600)
  store.openExperience(algebraBasics.id)
  await run.wait(600)
  await run.say(lines.path)
}

/** After Start over: a fresh conversation that just asks the opening question. */
export const greetingDemo: Script = async (run) => {
  await run.wait(700)
  await run.say(lines.greeting)
}

/** The stepper: each step runs in turn, the pictures count up on Visualizing. */
async function generate(run: DemoRun) {
  const { store } = run
  const { lessons, pictures, questions } = { lessons: 5, pictures: 24, questions: 15 }
  await run.wait(500)
  store.startGeneration({ title: algebraBasics.title, focus: 'from variables to simple equations', active: 0, lessons, pictures, picturesDone: 0, questions })
  await run.wait(2600)
  store.updateGeneration({ active: 1 })
  for (let done = 1; done <= pictures; done++) {
    await run.wait(170)
    store.updateGeneration({ picturesDone: done })
  }
  await run.wait(500)
  store.updateGeneration({ active: 2 })
  await run.wait(2400)
  store.updateGeneration({ active: 3 })
  await run.wait(900)
  store.updateGeneration({ active: 4 })
}
