import type { SlideStep } from '../lesson/types'

/**
 * Desktop and tablet: the image fills the body with 20px padding and 24px
 * corners. Mobile: a full-width 202px strip with square corners.
 */
export function Slide({ step }: { step: SlideStep }) {
  return (
    <div className="flex w-full flex-1 flex-col justify-center @tab:p-[20px]">
      <img
        src={step.image.url}
        alt={step.image.alt}
        className="h-[202px] w-full object-cover outline-1 -outline-offset-[0.5px] outline-border @tab:h-auto @tab:min-h-0 @tab:flex-1 @tab:rounded-[24px] @tab:outline-field-border @tab:outline-offset-0"
      />
    </div>
  )
}
