import type { PortalEvent } from '../domain/index.ts'
import { EventTime } from './EventTime.tsx'
import { ACTION_LABELS, OUTCOME_LABELS } from './labels.ts'

interface PortalHistoryProps {
  /** События одного портала в порядке журнала: старые → новые. */
  events: readonly PortalEvent[]
}

export function PortalHistory({ events }: PortalHistoryProps) {
  if (events.length === 0) {
    return <p className="inspector__muted">История изменений пока пуста.</p>
  }

  return (
    <ol className="history-list">
      {events.map((event) => (
        <li key={event.id} className="history-item">
          <div className="history-item__meta">
            <EventTime className="history-item__time" timestamp={event.timestamp} />
            <span className={`tag tag--${event.outcome.toLowerCase()}`}>
              {OUTCOME_LABELS[event.outcome]}
            </span>
          </div>
          <p className="history-item__action">{ACTION_LABELS[event.action]}</p>
          <p className="history-item__message">{event.message}</p>
        </li>
      ))}
    </ol>
  )
}
