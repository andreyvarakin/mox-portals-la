import type { AttentionKind, PortalAttentionItem } from '../application/index.ts'
import type { Portal } from '../domain/index.ts'

const ATTENTION_KIND_LABELS: Record<AttentionKind, string> = {
  CRITICAL: 'Критический',
  HIGH: 'Высокий риск',
  QUESTIONABLE: 'Под вопросом',
  MEDIUM: 'Средний риск',
}

interface AttentionListProps {
  /** Уже упорядочено getPortalSummary — здесь не пересортировывается. */
  items: readonly PortalAttentionItem[]
  /** Нужны только для имён порталов. */
  portals: readonly Portal[]
}

export function AttentionList({ items, portals }: AttentionListProps) {
  if (items.length === 0) {
    return <p className="empty-message">Порталы, требующие внимания, отсутствуют.</p>
  }

  return (
    <ol className="attention-list">
      {items.map((item, index) => {
        const name = portals.find((portal) => portal.id === item.portalId)?.name ?? item.portalId
        const kind = item.kind.toLowerCase()

        return (
          <li key={item.portalId} className={`attention-item attention-item--${kind}`}>
            <span className="attention-item__rank" aria-hidden="true">
              {index + 1}
            </span>
            <span className="attention-item__name">{name}</span>
            <span className={`tag tag--${kind}`}>{ATTENTION_KIND_LABELS[item.kind]}</span>
            <span className="attention-item__score">{`${item.riskScore} / 100`}</span>
          </li>
        )
      })}
    </ol>
  )
}
