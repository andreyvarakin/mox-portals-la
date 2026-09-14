/** Уровень риска портала. Вычисляется из параметров, в Portal не хранится. */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

/**
 * Значения отдельных факторов риска.
 * Смысл и шкала значений определяются вместе с формулой расчёта.
 */
export interface RiskFactors {
  stability: number
  energy: number
  collapseTime: number
}

/**
 * Результат расчёта риска портала.
 * Только контракт: сам расчёт пока не реализован.
 */
export interface RiskResult {
  score: number
  level: RiskLevel
  factors: RiskFactors
  /** Понятные человеку причины оценки. */
  reasons: string[]
}
