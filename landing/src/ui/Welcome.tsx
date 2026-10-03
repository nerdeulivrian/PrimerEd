import { Mic } from 'lucide-react'
import { Glow } from './Glow'

/** Screen 1: the greeting and the mic orb. The orb is START, the only tap. */
export function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-[32px] overflow-hidden bg-bg @desk:gap-[40px]">
      <Glow
        color="#FFD7A61F"
        className="top-[-170px] left-1/2 h-[320px] w-[700px] -translate-x-1/2 @desk:top-[-260px] @desk:h-[420px] @desk:w-[900px]"
      />
      <Glow
        color="#FF7A6B33"
        className="bottom-[-96px] left-[36%] h-[380px] w-[420px] @desk:bottom-[-220px] @desk:left-[53%] @desk:h-[520px] @desk:w-[760px]"
      />
      <Glow
        color="#FFB25C59"
        className="bottom-[-176px] left-1/2 h-[480px] w-[910px] -translate-x-1/2 @desk:bottom-[-280px] @desk:h-[620px] @desk:w-[1300px]"
      />

      <h1 className="relative flex flex-col items-center gap-[2px] text-center text-[36px] leading-[41px] font-extrabold tracking-[-0.6px] @tab:text-[48px] @tab:leading-[55px] @desk:text-[60px] @desk:leading-[69px] @desk:tracking-[-1px]">
        <span className="text-text">Welcome! Are you</span>
        <span className="text-brand-gradient">ready to learn?</span>
      </h1>

      <div className="relative flex flex-col items-center gap-[12px]">
        <div className="flex size-[200px] items-center justify-center rounded-full bg-[#FF96000A] outline-1 outline-solid outline-[#FF96001F] motion-safe:animate-breathe @desk:size-[236px]">
          <div className="flex size-[156px] items-center justify-center rounded-full bg-[#FF960014] outline-1 outline-solid outline-[#FF96002E] @desk:size-[184px]">
            <button
              type="button"
              onClick={onStart}
              aria-label="Start"
              className="flex size-[112px] cursor-pointer items-center justify-center rounded-full shadow-[0_16px_40px_#FF7A2F59,inset_0_-6px_14px_#D9531A66,inset_0_4px_10px_#FFFFFF59] transition-transform duration-200 ease-out outline-none hover:scale-[1.04] focus-visible:ring-4 focus-visible:ring-primary/40 active:scale-[0.96] @desk:size-[132px]"
              style={{ backgroundImage: 'radial-gradient(ellipse 70% 70% at 35% 30%, #FFC56A 0%, #FF9600 50%, #F2652A 100%)' }}
            >
              <Mic className="size-[48px] text-white" strokeWidth={2} />
            </button>
          </div>
        </div>
        <p className="text-[16px] font-bold text-text-secondary @desk:text-[17px]">Press to start</p>
      </div>

      <p className="absolute bottom-[34px] left-1/2 w-[310px] -translate-x-1/2 text-center text-[14px] leading-[20px] font-semibold text-text-secondary @tab:w-auto @tab:whitespace-nowrap @desk:bottom-[44px] @desk:text-[15px] @desk:leading-normal">
        Lessons happen out loud. Speak naturally, and interrupt anytime.
      </p>
    </div>
  )
}
