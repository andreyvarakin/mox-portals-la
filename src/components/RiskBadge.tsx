import type { RiskLevel } from '../domain/index.ts'
import { formatOutOf100 } from './formatters.ts'
import { RISK_LEVEL_LABELS } from './labels.ts'

interface RiskBadgeProps {
  level: RiskLevel
  score: number
}

/** Уровень риска словом и числом — цвет только дополняет текст. */
export function RiskBadge({ level, score }: RiskBadgeProps) {
  return (
    <span className="risk-badge">
      <span className={`tag tag--${level.toLowerCase()}`}>{RISK_LEVEL_LABELS[level]}</span>
      <span className="risk-badge__score">{formatOutOf100(score)}</span>
    </span>
  )
}
