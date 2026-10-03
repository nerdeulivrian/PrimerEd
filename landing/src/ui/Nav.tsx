import { House, Layers, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { View } from '../home/types'

/** The panel and tab bar slide in with the same easing. */
const SHELL_EASE = [0.2, 0.8, 0.2, 1] as const

interface Props {
  visible: boolean
  view: View
  badge: boolean
}

const tabs: { id: 'home' | 'experience'; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'experience', label: 'Experience', icon: Layers },
]

/** The level path belongs to the Experience tab. */
const isActive = (tab: 'home' | 'experience', view: View) => (tab === 'home' ? view === 'home' : view !== 'home')

/**
 * Desktop: the side panel on the left. It slides open the first time an
 * experience is ready. Tabs are visuals only: the voice AI switches them.
 */
export function SidePanel({ visible, view, badge }: Props) {
  return (
    <motion.aside
      aria-label="Sections"
      className="relative z-30 hidden shrink-0 overflow-hidden @desk:block"
      initial={false}
      animate={{ width: visible ? 264 : 0 }}
      transition={{ duration: 0.5, ease: SHELL_EASE }}
    >
      <div className="flex h-full w-[264px] flex-col gap-[6px] border-r border-border bg-surface px-[16px] py-[40px]">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = isActive(id, view)
          return (
            <div
              key={id}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-[12px] rounded-[14px] px-[14px] py-[12px] transition-colors duration-300 ${active ? 'bg-peach' : ''}`}
            >
              <Icon className={`size-[22px] shrink-0 ${active ? 'text-peach-text' : 'text-text-secondary'}`} strokeWidth={2} />
              <span className={`flex-1 text-[17px] ${active ? 'font-extrabold text-peach-text' : 'font-bold text-text'}`}>
                {label}
              </span>
              <AnimatePresence>
                {id === 'experience' && badge && (
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.35 }}
                    className="rounded-[10px] bg-primary px-[9px] py-[3px] text-[12px] font-extrabold tracking-[0.5px] text-white"
                  >
                    NEW
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </motion.aside>
  )
}

/** Mobile and tablet: the tab bar under the voice bar, in place of the side panel. */
export function TabBar({ visible, view, badge }: Props) {
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.nav
          aria-label="Sections"
          className="w-full @desk:hidden"
          initial={{ height: 0, opacity: 0, y: 24 }}
          animate={{ height: 'auto', opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: 24 }}
          transition={{ duration: 0.5, ease: SHELL_EASE }}
        >
          {/* Top padding so the dock's gap is part of the animated height. */}
          <div className="pt-[10px]">
            <div className="flex h-[64px] w-full gap-[6px] rounded-[32px] bg-[#FFFFFFE6] p-[6px] shadow-[0_6px_20px_#0000000F] outline-[1.5px] -outline-offset-[0.75px] outline-border outline-solid">
              {tabs.map(({ id, label, icon: Icon }) => {
                const active = isActive(id, view)
                return (
                  <div
                    key={id}
                    aria-current={active ? 'page' : undefined}
                    className={`flex flex-1 items-center justify-center gap-[8px] rounded-[26px] transition-colors duration-300 ${active ? 'bg-peach' : ''}`}
                  >
                    <Icon className={`size-[22px] shrink-0 ${active ? 'text-peach-text' : 'text-text-secondary'}`} strokeWidth={2} />
                    <span className={`text-[15px] ${active ? 'font-extrabold text-peach-text' : 'font-bold text-text'}`}>
                      {label}
                    </span>
                    <AnimatePresence>
                      {id === 'experience' && badge && (
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.35 }}
                          className="rounded-[9px] bg-primary px-[7px] py-[2px] text-[11px] font-extrabold tracking-[0.5px] text-white"
                        >
                          NEW
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
