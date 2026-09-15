import { calculateRisk, type Portal } from '../domain/index.ts'
import { formatCollapseMinutes } from './formatters.ts'
import { RiskBadge } from './RiskBadge.tsx'
import { StatusBadge } from './StatusBadge.tsx'

interface PortalTableProps {
  portals: readonly Portal[]
  selectedPortalId: string | null
  onSelectPortal: (portalId: string) => void
}

export function PortalTable({ portals, selectedPortalId, onSelectPortal }: PortalTableProps) {
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
            const isSelected = portal.id === selectedPortalId
            const rowClassName = [
              'portal-row',
              `portal-row--${risk.level.toLowerCase()}`,
              `portal-row--${portal.status.toLowerCase()}`,
              isSelected ? 'portal-row--selected' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <tr key={portal.id} className={rowClassName}>
                <th scope="row">
                  <button
                    type="button"
                    className="link-button"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => onSelectPortal(portal.id)}
                  >
                    {portal.name}
                  </button>
                </th>
                <td>{portal.destinationWorld}</td>
                <td className="num">{portal.energy}</td>
                <td className="num">{portal.stability}</td>
                <td className="num">{formatCollapseMinutes(portal.collapseMinutes)}</td>
                <td className="num">{portal.creaturesInside}</td>
                <td>
                  <StatusBadge status={portal.status} />
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
