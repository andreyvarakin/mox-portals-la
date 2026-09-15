import { formatTimestamp } from './formatters.ts'

interface EventTimeProps {
  timestamp: string
  className?: string
}

/** Время события: <time>, если строка — дата, иначе исходная строка как есть. */
export function EventTime({ timestamp, className }: EventTimeProps) {
  const formatted = formatTimestamp(timestamp)

  if (formatted === null) {
    return <span className={className}>{timestamp}</span>
  }
  return (
    <time className={className} dateTime={timestamp}>
      {formatted}
    </time>
  )
}
