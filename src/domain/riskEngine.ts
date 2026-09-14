import type { Portal } from './portal.ts'
import type { RiskLevel, RiskResult } from './risk.ts'

const STABILITY_WEIGHT = 0.45
const ENERGY_WEIGHT = 0.3
const TIME_WEIGHT = 0.25

/** Время до схлопывания, начиная с которого оно перестаёт добавлять риск. */
const TIME_HORIZON_MINUTES = 120

const LOW_STABILITY_BELOW = 40
const HIGH_ENERGY_ABOVE = 70
const IMMINENT_COLLAPSE_MINUTES = 30

/**
 * Считает риск портала.
 *
 * Для OPEN и QUESTIONABLE:
 *   stabilityRisk = 100 - stability
 *   energyRisk    = energy
 *   timeRisk      = clamp((120 - collapseMinutes) / 120 * 100, 0, 100)
 *   score = round(0.45 * stabilityRisk + 0.30 * energyRisk + 0.25 * timeRisk)
 *
 * Уровни: 0–29 LOW, 30–59 MEDIUM, 60–79 HIGH, 80–100 CRITICAL.
 * Закрытый портал текущего риска не несёт: score 0, LOW.
 * Существа внутри в риск не входят — это ограничение для действий.
 *
 * Чистая функция: Portal не изменяет, результат зависит только от аргумента.
 *
 * @throws Error, если у активного портала collapseMinutes равно null или отрицательно.
 */
export function calculateRisk(portal: Portal): RiskResult {
  if (portal.status === 'CLOSED') {
    return {
      score: 0,
      level: 'LOW',
      factors: { stability: 0, energy: 0, collapseTime: 0 },
      reasons: ['Портал закрыт и не представляет текущего риска'],
    }
  }

  const { collapseMinutes } = portal
  if (collapseMinutes === null) {
    throw new Error(
      `Портал ${portal.id} (${portal.status}): для активного портала не задано время до схлопывания`,
    )
  }
  if (collapseMinutes < 0) {
    throw new Error(
      `Портал ${portal.id} (${portal.status}): время до схлопывания не может быть отрицательным (${collapseMinutes})`,
    )
  }

  const stabilityRisk = 100 - portal.stability
  const energyRisk = portal.energy
  const timeRisk = clamp(
    ((TIME_HORIZON_MINUTES - collapseMinutes) / TIME_HORIZON_MINUTES) * 100,
    0,
    100,
  )

  // score считается из неокруглённого timeRisk; округление — только для отображения в factors.
  const score = Math.round(
    STABILITY_WEIGHT * stabilityRisk +
      ENERGY_WEIGHT * energyRisk +
      TIME_WEIGHT * timeRisk,
  )

  return {
    score,
    level: levelFromScore(score),
    factors: {
      stability: stabilityRisk,
      energy: energyRisk,
      collapseTime: roundToHundredths(timeRisk),
    },
    reasons: explainRisk(portal.stability, portal.energy, collapseMinutes),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100
}

function levelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL'
  if (score >= 60) return 'HIGH'
  if (score >= 30) return 'MEDIUM'
  return 'LOW'
}

function explainRisk(
  stability: number,
  energy: number,
  collapseMinutes: number,
): string[] {
  const reasons: string[] = []

  if (stability < LOW_STABILITY_BELOW) {
    reasons.push(`Низкая стабильность: ${stability} из 100`)
  }
  if (energy > HIGH_ENERGY_ABOVE) {
    reasons.push(`Высокая энергия: ${energy} из 100`)
  }
  if (collapseMinutes <= IMMINENT_COLLAPSE_MINUTES) {
    reasons.push(`Скорое схлопывание: через ${collapseMinutes} мин`)
  }

  if (reasons.length === 0) {
    reasons.push('Значимых факторов риска нет')
  }
  return reasons
}
