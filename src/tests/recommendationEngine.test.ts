import { describe, expect, it } from 'vitest'
import {
  calculateRisk,
  getActionAvailability,
  getPortalRecommendation,
  type Portal,
  type RecommendationCode,
  type RiskLevel,
} from '../domain/index.ts'

function makePortal(overrides: Partial<Portal> = {}): Portal {
  return {
    id: 'portal-1',
    name: 'Test portal',
    destinationWorld: 'Test world',
    energy: 40,
    stability: 60,
    collapseMinutes: 90,
    creaturesInside: 0,
    status: 'OPEN',
    ...overrides,
  }
}

// Параметры на каждый уровень риска; фактический уровень проверяется в самом тесте.
const LOW = { stability: 80, energy: 20, collapseMinutes: 120 } // score 15
const MEDIUM = { stability: 60, energy: 40, collapseMinutes: 90 } // score 36
const HIGH = { stability: 30, energy: 70, collapseMinutes: 60 } // score 65
const CRITICAL = { stability: 18, energy: 91, collapseMinutes: 8 } // score 88

const CASES: [string, RiskLevel, RecommendationCode, Partial<Portal>][] = [
  ['LOW + OPEN', 'LOW', 'KEEP_OPEN', LOW],
  ['LOW + OPEN с существами', 'LOW', 'KEEP_OPEN', { ...LOW, creaturesInside: 4 }],
  ['LOW + QUESTIONABLE', 'LOW', 'MANUAL_REVIEW', { ...LOW, status: 'QUESTIONABLE' }],
  ['MEDIUM + OPEN', 'MEDIUM', 'STABILIZE', MEDIUM],
  ['MEDIUM + QUESTIONABLE', 'MEDIUM', 'STABILIZE', { ...MEDIUM, status: 'QUESTIONABLE' }],
  ['HIGH + OPEN', 'HIGH', 'STABILIZE', HIGH],
  ['HIGH + QUESTIONABLE', 'HIGH', 'STABILIZE', { ...HIGH, status: 'QUESTIONABLE' }],
  ['CRITICAL без существ', 'CRITICAL', 'CLOSE', CRITICAL],
  ['CRITICAL с существами', 'CRITICAL', 'REVIEW_CREATURES', { ...CRITICAL, creaturesInside: 3 }],
  [
    'QUESTIONABLE + CRITICAL с существами',
    'CRITICAL',
    'REVIEW_CREATURES',
    { ...CRITICAL, status: 'QUESTIONABLE', creaturesInside: 3 },
  ],
  [
    'QUESTIONABLE + CRITICAL без существ',
    'CRITICAL',
    'CLOSE',
    { ...CRITICAL, status: 'QUESTIONABLE' },
  ],
]

describe('getPortalRecommendation', () => {
  it('CLOSED → NO_ACTION, риск не считается даже при критических параметрах и существах', () => {
    const portal = makePortal({ ...CRITICAL, status: 'CLOSED', collapseMinutes: null, creaturesInside: 3 })
    const recommendation = getPortalRecommendation(portal)

    expect(recommendation.code).toBe('NO_ACTION')
    expect(recommendation.message.trim()).not.toBe('')
  })

  it.each(CASES)('%s: риск %s → %s', (_label, level, code, overrides) => {
    const portal = makePortal(overrides)
    expect(calculateRisk(portal).level).toBe(level)

    const recommendation = getPortalRecommendation(portal)

    expect(recommendation.code).toBe(code)
    expect(recommendation.message.trim()).not.toBe('')
  })

  it('MEDIUM и HIGH дают один код, но разный текст', () => {
    const medium = getPortalRecommendation(makePortal(MEDIUM))
    const high = getPortalRecommendation(makePortal(HIGH))

    expect(medium.code).toBe(high.code)
    expect(medium.message).not.toBe(high.message)
  })

  it('рекомендованные STABILIZE и CLOSE выполнимы без подтверждения, REVIEW_CREATURES — нет', () => {
    for (const [label, , code, overrides] of CASES) {
      const portal = makePortal(overrides)

      if (code === 'STABILIZE' || code === 'CLOSE') {
        expect(getActionAvailability(portal, code).kind, label).toBe('ALLOWED')
      }
      if (code === 'REVIEW_CREATURES') {
        expect(getActionAvailability(portal, 'CLOSE').kind, label).toBe('REQUIRES_CONFIRMATION')
      }
    }
  })

  it('не мутирует исходный портал', () => {
    const portals = [
      makePortal({ ...CRITICAL, creaturesInside: 3 }),
      makePortal({ ...LOW, status: 'QUESTIONABLE' }),
      makePortal({ status: 'CLOSED', collapseMinutes: null }),
    ]

    for (const portal of portals) {
      const snapshot = structuredClone(portal)

      getPortalRecommendation(Object.freeze(portal))

      expect(portal).toEqual(snapshot)
    }
  })

  it('на одинаковом портале возвращает одинаковый результат', () => {
    const portal = makePortal({ ...CRITICAL, status: 'QUESTIONABLE', creaturesInside: 3 })

    expect(getPortalRecommendation(portal)).toEqual(getPortalRecommendation(portal))
  })
})
