import type { Experience, Level } from './types'

const ranks = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Master']

function levels(titles: string[]): Level[] {
  return titles.map((title, i) => ({ title, rank: ranks[i] }))
}

/** Saved before this visit (from PostgreSQL via the browser's JWT, later). */
export const solarSystem: Experience = {
  id: 'solar-system',
  title: 'The Solar System',
  subject: 'Science',
  headline: 'The Solar System: a tour of the planets',
  thumbnail: '/thumbs/solar-system.jpg',
  levels: levels(['Our star, the Sun', 'The rocky planets', 'The gas giants', 'Moons and rings', 'Beyond Neptune']),
  done: 3,
  isNew: false,
}

/** The experience the demo conversation makes. */
export const algebraBasics: Experience = {
  id: 'algebra-basics',
  title: 'Algebra Basics',
  subject: 'Mathematics',
  headline: 'Algebra Basics: from variables to simple equations',
  thumbnail: '/thumbs/algebra-basics.jpg',
  levels: levels([
    'What is a variable?',
    'Writing expressions',
    'Combining like terms',
    'One-step equations',
    'Two-step equations',
  ]),
  done: 0,
  isNew: true,
}

/** The demo conversation, as designed in designLandingScreen.pen. */
export const lines = {
  greeting: "Hi there! Do you want to make a new learning experience today, or pick up one you've done before?",
  pick: 'Something new. I want to learn algebra.',
  level: 'Great pick. How comfortable are you with algebra right now? Is it totally new, or have you seen some of it in school?',
  levelAnswer: "I've done a bit, but I always get lost with equations.",
  plan: "That's really common, so you're in good company. We'll start with what a variable actually is, then build up to solving simple equations one step at a time. Does that sound good?",
  agree: "Yes, let's do it.",
  making: "Perfect. I'll put together your Algebra lessons now, with slides, pictures, and a few questions to check what you've learned. It'll only take a moment.",
  ready: 'All set! Your Algebra Basics experience is ready. Do you wanna hop into it?',
  hop: 'Yes!',
  experienceTab: "Here's your Experience tab. Opening Algebra Basics for you now.",
  path: `Here's your path for Algebra Basics. Ready to start Level 1, "What is a variable?"`,
}

export const status = {
  speaking: 'PrimerEd is speaking…',
  listening: 'Listening…',
  opening: (title: string) => `Opening ${title}…`,
}
