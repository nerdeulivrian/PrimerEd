import { AnimatePresence, motion } from 'motion/react'
import type { HomeState } from '../home/types'
import { ExperienceTab } from './ExperienceTab'
import { Glow } from './Glow'
import { LevelPath } from './LevelPath'
import { SidePanel, TabBar } from './Nav'
import { SpokenText } from './SpokenText'
import { Thread } from './Thread'
import { VoiceBar } from './VoiceBar'
import { Welcome } from './Welcome'

interface Props {
  state: HomeState
  onStart: () => void
  onStop: () => void
  onStartOver: () => void
}

function Page({ state }: { state: HomeState }) {
  switch (state.view) {
    case 'home':
      return <Thread thread={state.thread} generation={state.generation} />
    case 'experience':
      return <ExperienceTab experiences={state.experiences} />
    case 'path': {
      const experience = state.experiences.find((e) => e.id === state.openId)
      return experience ? <LevelPath experience={experience} /> : null
    }
  }
}

/**
 * Everything before a lesson. Base styles are mobile; `@tab:` (≥755px) keeps
 * the mobile layout in a centred column; `@desk:` (≥1025px) is the desktop
 * design with the side panel. Must sit inside an `@container` element.
 *
 * Layout, top to bottom: the page (thread, Experience tab or level path),
 * then the dock: floating caption, voice bar, and the tab bar (mobile and
 * tablet) or the disclaimer.
 */
export function Home({ state, onStart, onStop, onStartOver }: Props) {
  const stopped = state.phase === 'stopped'

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.phase === 'welcome' ? (
        <motion.div
          key="welcome"
          className="h-full"
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3, ease: 'easeIn' }}
        >
          <Welcome onStart={onStart} />
        </motion.div>
      ) : (
        <motion.div
          key="session"
          className="relative flex h-full overflow-hidden bg-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <SidePanel visible={state.shell} view={state.view} badge={state.badge} />

          <main className="relative flex min-w-0 flex-1 flex-col">
            {/* Warm glow behind the voice bar; it goes out when the session stops. */}
            {/* Mobile: behind the thread. Desktop: over the bottom fade, as designed. */}
            <div
              className={`pointer-events-none absolute inset-0 z-0 transition-opacity duration-700 @desk:z-[15] ${stopped ? 'opacity-0' : 'opacity-100'}`}
            >
              <Glow
                color="#FFB25C40"
                className="bottom-[-206px] left-1/2 h-[400px] w-[900px] -translate-x-1/2 @desk:bottom-[-220px] @desk:h-[420px]"
              />
            </div>

            <div className="relative z-10 min-h-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={state.view === 'path' ? `path-${state.openId}` : state.view}
                  className="h-full"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <Page state={state} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Desktop: content fades out behind the voice bar. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden h-[184px] bg-linear-to-b from-bg/0 to-bg to-45% @desk:block"
            />

            <motion.div
              className="relative z-20 mx-auto flex w-full flex-col items-center px-[16px] pb-[16px] @tab:max-w-[672px] @desk:max-w-[880px] @desk:px-[40px] @desk:pb-[20px]"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
            >
              <AnimatePresence mode="popLayout">
                {state.caption && (
                  <motion.p
                    key={state.caption.id}
                    aria-live="polite"
                    className="w-full px-[8px] pb-[12px] text-center text-[15px] leading-[22px] font-semibold text-text/55 @desk:max-w-[720px] @desk:px-0 @desk:text-[18px] @desk:leading-[26px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <SpokenText text={state.caption.text} wordMs={state.caption.wordMs} />
                  </motion.p>
                )}
              </AnimatePresence>

              <VoiceBar
                stopped={stopped}
                status={state.status}
                speaking={state.speaking}
                onStop={onStop}
                onStartOver={onStartOver}
              />

              <TabBar visible={state.shell} view={state.view} badge={state.badge} />

              {/* Mobile and tablet only show it while there's no tab bar; desktop always does. */}
              <p
                className={`pt-[8px] text-[12px] font-semibold text-text-secondary @desk:block @desk:pt-[14px] @desk:text-[13px] ${state.shell ? 'hidden' : ''}`}
              >
                PrimerEd is AI and can make mistakes.
              </p>
            </motion.div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
