interface Props {
  text: string
  /** Delay between words. 0 shows the text at once. */
  wordMs: number
}

/** Text the AI is saying: the words appear one by one, as they're spoken. */
export function SpokenText({ text, wordMs }: Props) {
  if (!wordMs) return <>{text}</>
  return (
    <>
      {text.split(' ').map((word, i) => (
        <span key={i} className="motion-safe:animate-word" style={{ animationDelay: `${i * wordMs}ms` }}>
          {word}{' '}
        </span>
      ))}
    </>
  )
}
