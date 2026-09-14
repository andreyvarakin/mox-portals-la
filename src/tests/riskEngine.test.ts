import { describe, expect, it } from 'vitest'
import { calculateRisk, type Portal, type PortalStatus } from '../domain/index.ts'

/** По умолчанию — полностью безопасный открытый портал. */
function makePortal(overrides: Partial<Portal> = {}): Portal {
  return {
    id: 'portal-1',
    name: 'Test portal',
    destinationWorld: 'Test world',
    energy: 0,
    stability: 100,
    collapseMinutes: 120,
    creaturesInside: 0,
    status: 'OPEN',
    ...overrides,
  }
}

describe('calculateRisk: score и уровень', () => {
  it('полностью безопасный портал даёт 0 и LOW', () => {
    const result = calculateRisk(makePortal())

    expect(result.score).toBe(0)
    expect(result.level).toBe('LOW')
    expect(result.factors).toEqual({ stability: 0, energy: 0, collapseTime: 0 })
  })

  it('критический пример: факторы до весов, score 88, CRITICAL', () => {
    const result = calculateRisk(
      makePortal({ stability: 18, energy: 91, collapseMinutes: 8 }),
    )

    expect(result.factors.stability).toBe(82)
    expect(result.factors.energy).toBe(91)
    expect(result.factors.collapseTime).toBe(93.33)
    expect(result.score).toBe(88)
    expect(result.level).toBe('CRITICAL')
  })

  it.each<[number, number, number, number, string]>([
    // stability, energy, collapseMinutes, score, level
    [100, 97, 120, 29, 'LOW'],
    [100, 100, 120, 30, 'MEDIUM'],
    [0, 47, 120, 59, 'MEDIUM'],
    [0, 50, 120, 60, 'HIGH'],
    [0, 100, 101, 79, 'HIGH'],
    [0, 100, 96, 80, 'CRITICAL'],
    [0, 100, 0, 100, 'CRITICAL'],
  ])(
    'граница уровней: stability=%d energy=%d minutes=%d → %d %s',
    (stability, energy, collapseMinutes, score, level) => {
      const result = calculateRisk(makePortal({ stability, energy, collapseMinutes }))

      expect(result.score).toBe(score)
      expect(result.level).toBe(level)
    },
  )

  it('score считается из неокруглённого timeRisk', () => {
    // timeRisk = 19.996 → в factors 20.00.
    // Точный расчёт: 45 + 1.5 + 4.999 = 51.499 → 51.
    // Из округлённого получилось бы 45 + 1.5 + 5 = 51.5 → 52.
    const result = calculateRisk(
      makePortal({ stability: 0, energy: 5, collapseMinutes: 96.0048 }),
    )

    expect(result.factors.collapseTime).toBe(20)
    expect(result.score).toBe(51)
  })

  it('существа внутри не влияют на риск', () => {
    const empty = calculateRisk(makePortal({ stability: 30, energy: 80, creaturesInside: 0 }))
    const crowded = calculateRisk(makePortal({ stability: 30, energy: 80, creaturesInside: 500 }))

    expect(crowded).toEqual(empty)
  })

  it('QUESTIONABLE считается так же, как OPEN', () => {
    const params = { stability: 25, energy: 75, collapseMinutes: 20 }

    expect(calculateRisk(makePortal({ ...params, status: 'QUESTIONABLE' }))).toEqual(
      calculateRisk(makePortal({ ...params, status: 'OPEN' })),
    )
  })
})

describe('calculateRisk: timeRisk', () => {
  it.each([
    [120, 0],
    [60, 50],
    [30, 75],
    [0, 100],
    [500, 0],
  ])('collapseMinutes=%d → timeRisk %d', (collapseMinutes, timeRisk) => {
    const result = calculateRisk(makePortal({ collapseMinutes }))

    expect(result.factors.collapseTime).toBe(timeRisk)
  })
})

describe('calculateRisk: закрытый портал', () => {
  it('CLOSED даёт 0, LOW, нулевые факторы и не требует collapseMinutes', () => {
    const result = calculateRisk(
      makePortal({ status: 'CLOSED', stability: 0, energy: 100, collapseMinutes: null }),
    )

    expect(result.score).toBe(0)
    expect(result.level).toBe('LOW')
    expect(result.factors).toEqual({ stability: 0, energy: 0, collapseTime: 0 })
    expect(result.reasons.length).toBeGreaterThan(0)
  })
})

describe('calculateRisk: некорректное время у активного портала', () => {
  it.each<[PortalStatus, number | null]>([
    ['OPEN', null],
    ['OPEN', -1],
    ['QUESTIONABLE', null],
    ['QUESTIONABLE', -1],
  ])('%s с collapseMinutes=%s → Error', (status, collapseMinutes) => {
    expect(() => calculateRisk(makePortal({ status, collapseMinutes }))).toThrow(Error)
  })
})

describe('calculateRisk: причины', () => {
  const noFactorsReasons = calculateRisk(makePortal()).reasons

  it('без значимых факторов причины всё равно не пустые', () => {
    expect(noFactorsReasons).toHaveLength(1)
  })

  it('при трёх значимых факторах — три причины', () => {
    const result = calculateRisk(
      makePortal({ stability: 18, energy: 91, collapseMinutes: 8 }),
    )

    expect(result.reasons).toHaveLength(3)
  })

  it.each<[string, Partial<Portal>, boolean]>([
    ['stability 40', { stability: 40 }, false],
    ['stability 39', { stability: 39 }, true],
    ['energy 70', { energy: 70 }, false],
    ['energy 71', { energy: 71 }, true],
    ['collapseMinutes 31', { collapseMinutes: 31 }, false],
    ['collapseMinutes 30', { collapseMinutes: 30 }, true],
  ])('порог причины: %s → значимый фактор: %s', (_label, overrides, significant) => {
    const { reasons } = calculateRisk(makePortal(overrides))

    expect(reasons).toHaveLength(1)
    if (significant) {
      expect(reasons).not.toEqual(noFactorsReasons)
    } else {
      expect(reasons).toEqual(noFactorsReasons)
    }
  })
})

describe('calculateRisk: чистота', () => {
  it('не изменяет переданный портал', () => {
    const portal = makePortal({ stability: 18, energy: 91, collapseMinutes: 8 })
    const snapshot = structuredClone(portal)

    calculateRisk(Object.freeze(portal))

    expect(portal).toEqual(snapshot)
  })

  it('на одинаковом портале возвращает одинаковый результат', () => {
    const portal = makePortal({ stability: 55, energy: 42, collapseMinutes: 47 })

    expect(calculateRisk(portal)).toEqual(calculateRisk(portal))
  })
})
