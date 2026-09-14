/** Уровень риска портала. Вычисляется из параметров, в Portal не хранится. */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

/**
 * Нормализованные компоненты риска 0–100 до применения весов.
 * Формула — в calculateRisk (riskEngine.ts).
 */
export interface RiskFactors {
  stability: number
  energy: number
  collapseTime: number
}

/** Результат расчёта риска портала, см. calculateRisk. */
export interface RiskResult {
  score: number
  level: RiskLevel
  factors: RiskFactors
  /** Понятные человеку причины оценки. */
  reasons: string[]
}
