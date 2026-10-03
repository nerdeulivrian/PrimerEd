interface Props {
  chunks: string[]
  /** Fade each piece in as it arrives. */
  animate: boolean
}

/**
 * Text the AI is saying, as its live transcript streams in: each new piece
 * fades in at the end. Earlier pieces keep their keys, so they don't replay.
 */
export function SpokenText({ chunks, animate }: Props) {
  if (!animate) return <>{chunks.join('')}</>
  return (
    <>
      {chunks.map((chunk, i) => (
        <span key={i} className="motion-safe:animate-word">
          {chunk}
        </span>
      ))}
    </>
  )
}
