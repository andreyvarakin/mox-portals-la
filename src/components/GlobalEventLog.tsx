import type { Portal, PortalEvent } from '../domain/index.ts'
import { describeSnapshotChanges } from './eventChanges.ts'
import { EventTime } from './EventTime.tsx'
import { formatEventCount } from './formatters.ts'
import { ACTION_LABELS, OUTCOME_LABELS } from './labels.ts'

interface GlobalEventLogProps {
  /** Все события в порядке PortalAppState: старые → новые. Не пересортировываются. */
  events: readonly PortalEvent[]
  /** Нужны только для имён порталов. */
  portals: readonly Portal[]
}

export function GlobalEventLog({ events, portals }: GlobalEventLogProps) {
  return (
    <section aria-labelledby="event-log-title">
      <div className="section-heading">
        <h2 id="event-log-title" className="section-title">
          Журнал событий
        </h2>
        <p className="section-heading__count">{formatEventCount(events.length)}</p>
      </div>

      <div className="panel">
        {events.length === 0 ? (
          <div className="empty-message">
            <p className="event-log__empty-title">Событий пока нет.</p>
            <p className="event-log__empty-hint">Действия оператора появятся здесь после выполнения.</p>
          </div>
        ) : (
          <ol className="event-log">
            {events.map((event) => {
              const portalName =
                portals.find((portal) => portal.id === event.portalId)?.name ?? event.portalId
              const changes = describeSnapshotChanges(event.before, event.after)

              return (
                <li key={event.id} className="event-log__item">
                  <div className="event-log__meta">
                    <EventTime className="event-log__time" timestamp={event.timestamp} />
                    <span className="event-log__portal">{portalName}</span>
                  </div>

                  <div className="event-log__body">
                    <p className="event-log__title">
                      <span>{ACTION_LABELS[event.action]}</span>
                      <span className={`tag tag--${event.outcome.toLowerCase()}`}>
                        {OUTCOME_LABELS[event.outcome]}
                      </span>
                    </p>
                    <p className="event-log__message">{event.message}</p>

                    {changes.length > 0 ? (
                      <dl className="change-list">
                        {changes.map((change) => (
                          <div key={change.label} className="change-list__row">
                            <dt>{change.label}</dt>
                            <dd>{`${change.before} → ${change.after}`}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      // Подпись нужна только выполненному действию: запрет и запрос
                      // подтверждения портал и так не меняют.
                      event.outcome === 'APPLIED' && (
                        <p className="event-log__no-changes">Параметры портала не изменились.</p>
                      )
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
