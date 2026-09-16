import {
  calculateRisk,
  getPortalRecommendation,
  type Portal,
  type PortalAction,
  type PortalEvent,
  type RiskFactors,
} from '../domain/index.ts'
import { formatCollapseMinutes, formatOutOf100 } from './formatters.ts'
import { PortalActions, type PendingConfirmation } from './PortalActions.tsx'
import { PortalHistory } from './PortalHistory.tsx'
import { RiskBadge } from './RiskBadge.tsx'
import { StatusBadge } from './StatusBadge.tsx'

/** Факторы — нормализованные компоненты риска, а не исходные параметры портала. */
const FACTOR_LABELS: [keyof RiskFactors, string][] = [
  ['stability', 'Риск по стабильности'],
  ['energy', 'Риск по энергии'],
  ['collapseTime', 'Риск по времени'],
]

/** Описание модели риска для пользователя. Балл считает calculateRisk, здесь только текст. */
const RISK_WEIGHTS: [string, string][] = [
  ['45%', 'риск низкой стабильности'],
  ['30%', 'риск высокой энергии'],
  ['25%', 'риск близкого схлопывания'],
]

interface PortalDetailsProps {
  /** undefined — портал не выбран или выбранного больше нет в списке. */
  portal: Portal | undefined
  /** События только этого портала. */
  events: readonly PortalEvent[]
  /** Подтверждение закрытия для этого портала или null. */
  pendingConfirmation: PendingConfirmation | null
  onAction: (action: PortalAction) => void
  onConfirm: () => void
  onCancelConfirmation: () => void
}

export function PortalDetails({
  portal,
  events,
  pendingConfirmation,
  onAction,
  onConfirm,
  onCancelConfirmation,
}: PortalDetailsProps) {
  if (!portal) {
    return (
      <aside className="inspector" aria-labelledby="inspector-label">
        <p id="inspector-label" className="inspector__eyebrow">
          Карточка портала
        </p>
        <h3 className="inspector__title">Выберите портал</h3>
        <p className="inspector__muted">
          Откройте портал из таблицы или списка внимания, чтобы увидеть риск, рекомендацию и
          историю.
        </p>
      </aside>
    )
  }

  const risk = calculateRisk(portal)
  const recommendation = getPortalRecommendation(portal)

  return (
    <aside
      className={`inspector inspector--${risk.level.toLowerCase()}`}
      aria-labelledby="inspector-label"
    >
      <div>
        <p id="inspector-label" className="inspector__eyebrow">
          Карточка портала
        </p>
        <h3 className="inspector__title">{portal.name}</h3>
        <dl className="detail-list">
          <dt>Мир</dt>
          <dd>{portal.destinationWorld}</dd>
          <dt>Статус</dt>
          <dd>
            <StatusBadge status={portal.status} />
          </dd>
        </dl>
      </div>

      <section className="inspector__section">
        <h4>Параметры</h4>
        <dl className="detail-list">
          <dt>Энергия</dt>
          <dd>{formatOutOf100(portal.energy)}</dd>
          <dt>Стабильность</dt>
          <dd>{formatOutOf100(portal.stability)}</dd>
          <dt>До схлопывания</dt>
          <dd>{formatCollapseMinutes(portal.collapseMinutes)}</dd>
          <dt>Существа внутри</dt>
          <dd>{portal.creaturesInside}</dd>
        </dl>
      </section>

      <section className="inspector__section">
        <h4>Риск</h4>
        <div className="inspector__risk">
          <RiskBadge level={risk.level} score={risk.score} />
        </div>
      </section>

      <section className="inspector__section">
        <h4>Почему такой риск</h4>
        {risk.reasons.length === 1 ? (
          <p className="inspector__text">{risk.reasons[0]}</p>
        ) : (
          <ul className="reason-list">
            {risk.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="inspector__section">
        <h4>Факторы риска</h4>
        <dl className="factor-list">
          {FACTOR_LABELS.map(([key, label]) => (
            <div key={key} className="factor">
              <dt>{label}</dt>
              <dd>
                {formatOutOf100(risk.factors[key])}
                <span className="factor__bar" aria-hidden="true">
                  <span className="factor__fill" style={{ width: `${risk.factors[key]}%` }} />
                </span>
              </dd>
            </div>
          ))}
        </dl>

        {/* Справка о модели риска. Считает по-прежнему только calculateRisk. */}
        <details className="risk-help">
          <summary className="risk-help__summary">Как считается риск</summary>
          <div className="risk-help__body">
            <dl className="risk-help__weights">
              {RISK_WEIGHTS.map(([share, description]) => (
                <div key={share} className="risk-help__weight">
                  <dt>{share}</dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
            <p>
              Время берётся на горизонте 120 минут: чем меньше его осталось, тем выше эта часть
              балла.
            </p>
            <p>
              Уровни: 0–29 — низкий, 30–59 — средний, 60–79 — высокий, 80–100 — критический.
            </p>
            <p>
              Существа внутри не входят в технический балл риска, но влияют на допустимость
              закрытия портала.
            </p>
          </div>
        </details>
      </section>

      <section
        className={`inspector__section recommendation recommendation--${recommendation.code.toLowerCase()}`}
      >
        <h4>Рекомендация</h4>
        <p className="inspector__text">{recommendation.message}</p>
      </section>

      <section className="inspector__section inspector__actions">
        <h4>Действия</h4>
        <PortalActions
          portal={portal}
          pendingConfirmation={pendingConfirmation}
          onAction={onAction}
          onConfirm={onConfirm}
          onCancelConfirmation={onCancelConfirmation}
        />
      </section>

      <section className="inspector__section">
        <h4>История изменений</h4>
        <PortalHistory events={events} />
      </section>
    </aside>
  )
}
