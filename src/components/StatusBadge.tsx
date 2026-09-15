import type { PortalStatus } from '../domain/index.ts'
import { STATUS_LABELS } from './labels.ts'

export function StatusBadge({ status }: { status: PortalStatus }) {
  return <span className={`status status--${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>
}
