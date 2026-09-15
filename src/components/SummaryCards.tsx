import type { PortalSummary } from '../application/index.ts'

interface SummaryCardsProps {
  summary: Pick<PortalSummary, 'openCount' | 'criticalCount' | 'closedCount'>
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const criticalClassName =
    summary.criticalCount > 0 ? 'summary-card summary-card--critical' : 'summary-card'

  return (
    <dl className="summary-cards">
      <div className="summary-card">
        <dt>Открыто</dt>
        <dd>{summary.openCount}</dd>
      </div>
      <div className={criticalClassName}>
        <dt>Критичных</dt>
        <dd>{summary.criticalCount}</dd>
      </div>
      <div className="summary-card">
        <dt>Закрыто</dt>
        <dd>{summary.closedCount}</dd>
      </div>
    </dl>
  )
}
