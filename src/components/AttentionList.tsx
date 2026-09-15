import type { AttentionKind, PortalAttentionItem } from '../application/index.ts'
import type { Portal } from '../domain/index.ts'
import { formatOutOf100 } from './formatters.ts'

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
  selectedPortalId: string | null
  onSelectPortal: (portalId: string) => void
}

export function AttentionList({ items, portals, selectedPortalId, onSelectPortal }: AttentionListProps) {
  if (items.length === 0) {
    return <p className="empty-message">Порталы, требующие внимания, отсутствуют.</p>
  }

  return (
    <ol className="attention-list">
      {items.map((item, index) => {
        const name = portals.find((portal) => portal.id === item.portalId)?.name ?? item.portalId
        const kind = item.kind.toLowerCase()
        const isSelected = item.portalId === selectedPortalId

        return (
          <li key={item.portalId}>
            <button
              type="button"
              className={`attention-item attention-item--${kind}`}
              aria-current={isSelected ? 'true' : undefined}
              onClick={() => onSelectPortal(item.portalId)}
            >
              <span className="attention-item__rank" aria-hidden="true">
                {index + 1}
              </span>
              <span className="attention-item__name">{name}</span>
              <span className={`tag tag--${kind}`}>{ATTENTION_KIND_LABELS[item.kind]}</span>
              <span className="attention-item__score">{formatOutOf100(item.riskScore)}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
