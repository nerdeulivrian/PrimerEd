interface Props {
  /** e.g. "#FFB25C40": the glow fades from this to transparent. */
  color: string
  className: string
}

/** A soft blurred radial glow, placed with `className` (absolute position and size). */
export function Glow({ color, className }: Props) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full blur-[30px] ${className}`}
      style={{ backgroundImage: `radial-gradient(ellipse 50% 50% at 50% 50%, ${color} 0%, ${color.slice(0, 7)}00 100%)` }}
    />
  )
}
