import type { Lesson } from './types'

/** Sample payload so every screen type can be exercised in the simulator. */
export const sampleLesson: Lesson = {
  schema_version: 1,
  lesson: {
    id: 'solar-system-01',
    title: 'The Solar System',
    mode: 'practice',
    intro_narration: "Today we're exploring the planets that travel around our Sun.",
    outro_narration: 'Great work today! See you next lesson.',
    learning_objectives: [
      'Name the eight planets in order from the Sun',
      'Explain how gravity keeps planets in orbit',
      'Tell the difference between a planet and a dwarf planet',
    ],
  },
  steps: [
    {
      id: 's1',
      type: 'slide',
      image: { url: '/slides/argumentation-debate.png', alt: 'Argumentation and debate illustration' },
      narration: 'This is our Solar System: the Sun and everything that orbits it.',
      talking_points: ['8 planets', 'The Sun is a star', 'Gravity keeps planets in orbit'],
    },
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'Which planet in our solar system is closest to the Sun?',
      narration: 'Which planet in our solar system is closest to the Sun?',
      options: [
        { id: 'A', text: 'Venus' },
        { id: 'B', text: 'Mercury' },
        { id: 'C', text: 'Earth' },
        { id: 'D', text: 'Mars' },
      ],
      answer: 'B',
      feedback: {
        correct: 'Right! Mercury is the closest planet to the Sun.',
        incorrect: 'Not quite. Mercury is the closest planet to the Sun.',
      },
    },
    {
      id: 'q2',
      type: 'true_false',
      question: 'The Sun is a star.',
      narration: 'True or false: the Sun is a star.',
      answer: true,
      feedback: {
        correct: 'Yes! The Sun is a medium-sized star.',
        incorrect: 'Actually, it is. The Sun is a medium-sized star.',
      },
    },
    {
      id: 's2',
      type: 'slide',
      image: { url: '/slides/argumentation-debate.png', alt: 'Argumentation and debate illustration' },
      narration: 'The four inner planets are small and rocky.',
      talking_points: ['Mercury, Venus, Earth, Mars', 'Rocky surfaces'],
    },
    {
      id: 'q3',
      type: 'speak_answer',
      question: 'What is the largest planet in our solar system?',
      narration: 'What is the largest planet in our solar system? Say your answer.',
      answer: 'jupiter',
      feedback: {
        correct: 'Correct! Jupiter is the largest planet.',
        incorrect: 'The answer is Jupiter, the largest planet.',
      },
    },
    {
      id: 'q4',
      type: 'multiple_choice',
      question: 'What keeps the planets in orbit around the Sun?',
      narration: 'What keeps the planets in orbit around the Sun?',
      options: [
        { id: 'A', text: 'Magnetism' },
        { id: 'B', text: 'Solar wind' },
        { id: 'C', text: "The Sun's gravity" },
      ],
      answer: 'C',
      feedback: {
        correct: "Exactly. The Sun's gravity holds every planet in orbit.",
        incorrect: "It's the Sun's gravity that holds every planet in orbit.",
      },
    },
  ],
}
