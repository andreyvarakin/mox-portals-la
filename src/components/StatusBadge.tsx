import type { PortalStatus } from '../domain/index.ts'

const STATUS_LABELS: Record<PortalStatus, string> = {
  OPEN: 'Открыт',
  QUESTIONABLE: 'Под вопросом',
  CLOSED: 'Закрыт',
}

export function StatusBadge({ status }: { status: PortalStatus }) {
  return <span className={`status status--${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>
}
