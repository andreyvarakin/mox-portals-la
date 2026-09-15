import { calculateRisk, type Portal, type PortalStatus } from '../domain/index.ts'
import { RiskBadge } from './RiskBadge.tsx'

const STATUS_LABELS: Record<PortalStatus, string> = {
  OPEN: 'Открыт',
  QUESTIONABLE: 'Под вопросом',
  CLOSED: 'Закрыт',
}

function formatCollapseMinutes(minutes: number | null): string {
  return minutes === null ? '—' : `${minutes} мин`
}

interface PortalTableProps {
  portals: readonly Portal[]
}

export function PortalTable({ portals }: PortalTableProps) {
  if (portals.length === 0) {
    return <p className="empty-message">Порталов пока нет.</p>
  }

  return (
    // Прокрутка на узком экране; tabIndex — чтобы прокручивать с клавиатуры.
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Таблица порталов">
      <table className="portal-table">
        <thead>
          <tr>
            <th scope="col">Портал</th>
            <th scope="col">Мир</th>
            <th scope="col" className="num">Энергия</th>
            <th scope="col" className="num">Стабильность</th>
            <th scope="col" className="num">До схлопывания</th>
            <th scope="col" className="num">Существа</th>
            <th scope="col">Статус</th>
            <th scope="col">Риск</th>
          </tr>
        </thead>
        <tbody>
          {portals.map((portal) => {
            const risk = calculateRisk(portal)
            const status = portal.status.toLowerCase()

            return (
              <tr
                key={portal.id}
                className={`portal-row portal-row--${risk.level.toLowerCase()} portal-row--${status}`}
              >
                <th scope="row">{portal.name}</th>
                <td>{portal.destinationWorld}</td>
                <td className="num">{portal.energy}</td>
                <td className="num">{portal.stability}</td>
                <td className="num">{formatCollapseMinutes(portal.collapseMinutes)}</td>
                <td className="num">{portal.creaturesInside}</td>
                <td>
                  <span className={`status status--${status}`}>{STATUS_LABELS[portal.status]}</span>
                </td>
                <td>
                  <RiskBadge level={risk.level} score={risk.score} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
