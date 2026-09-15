import type { PortalAction, PortalEvent, PortalEventOutcome } from '../domain/index.ts'
import { formatTimestamp } from './formatters.ts'

const ACTION_LABELS: Record<PortalAction, string> = {
  STABILIZE: 'Стабилизация',
  CLOSE: 'Закрытие',
  SEND_OBSERVER: 'Отправка наблюдателя',
  MARK_QUESTIONABLE: 'Пометка «под вопросом»',
  CLEAR_QUESTIONABLE: 'Снятие отметки',
}

const OUTCOME_LABELS: Record<PortalEventOutcome, string> = {
  APPLIED: 'Выполнено',
  BLOCKED: 'Заблокировано',
  REQUIRES_CONFIRMATION: 'Требует подтверждения',
}

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
      {events.map((event) => {
        const formattedTime = formatTimestamp(event.timestamp)

        return (
          <li key={event.id} className="history-item">
            <div className="history-item__meta">
              {formattedTime === null ? (
                <span className="history-item__time">{event.timestamp}</span>
              ) : (
                <time className="history-item__time" dateTime={event.timestamp}>
                  {formattedTime}
                </time>
              )}
              <span className={`tag tag--${event.outcome.toLowerCase()}`}>
                {OUTCOME_LABELS[event.outcome]}
              </span>
            </div>
            <p className="history-item__action">{ACTION_LABELS[event.action]}</p>
            <p className="history-item__message">{event.message}</p>
          </li>
        )
      })}
    </ol>
  )
}
