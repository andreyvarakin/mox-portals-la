import type { RiskLevel } from '../domain/index.ts'

const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  CRITICAL: 'Критический',
}

interface RiskBadgeProps {
  level: RiskLevel
  score: number
}

/** Уровень риска словом и числом — цвет только дополняет текст. */
export function RiskBadge({ level, score }: RiskBadgeProps) {
  return (
    <span className="risk-badge">
      <span className={`tag tag--${level.toLowerCase()}`}>{RISK_LEVEL_LABELS[level]}</span>
      <span className="risk-badge__score">{`${score} / 100`}</span>
    </span>
  )
}
