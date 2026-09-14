import { describe, expect, expectTypeOf, it } from 'vitest'
import { demoPortals } from '../data/index.ts'
import {
  calculateRisk,
  getPortalRecommendation,
  type Portal,
} from '../domain/index.ts'

describe('demoPortals', () => {
  it('содержит ровно 8 порталов', () => {
    expect(demoPortals).toHaveLength(8)
  })

  it('все id уникальны', () => {
    const ids = demoPortals.map((portal) => portal.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('экспортируется как массив только для чтения', () => {
    expectTypeOf(demoPortals).toEqualTypeOf<readonly Portal[]>()
  })

  it('calculateRisk даёт задуманные score и уровень', () => {
    const actual = demoPortals.map((portal) => {
      const { score, level } = calculateRisk(portal)
      return { id: portal.id, score, level }
    })

    expect(actual).toEqual([
      { id: 'aurora-gate', score: 10, level: 'LOW' },
      { id: 'mirror-passage', score: 13, level: 'LOW' },
      { id: 'lumia-rift', score: 36, level: 'MEDIUM' },
      { id: 'ash-rift', score: 66, level: 'HIGH' },
      { id: 'abyss-gate', score: 88, level: 'CRITICAL' },
      { id: 'void-maw', score: 85, level: 'CRITICAL' },
      { id: 'chronos-tear', score: 49, level: 'MEDIUM' },
      { id: 'erebus-node', score: 0, level: 'LOW' },
    ])
  })

  it('getPortalRecommendation даёт задуманные рекомендации', () => {
    const actual = demoPortals.map((portal) => ({
      id: portal.id,
      code: getPortalRecommendation(portal).code,
    }))

    expect(actual).toEqual([
      { id: 'aurora-gate', code: 'KEEP_OPEN' },
      { id: 'mirror-passage', code: 'MANUAL_REVIEW' },
      { id: 'lumia-rift', code: 'STABILIZE' },
      { id: 'ash-rift', code: 'STABILIZE' },
      { id: 'abyss-gate', code: 'CLOSE' },
      { id: 'void-maw', code: 'REVIEW_CREATURES' },
      { id: 'chronos-tear', code: 'STABILIZE' },
      { id: 'erebus-node', code: 'NO_ACTION' },
    ])
  })

  it('покрывает обязательные сценарии', () => {
    const rows = demoPortals.map((portal) => ({ portal, level: calculateRisk(portal).level }))
    const count = (predicate: (row: (typeof rows)[number]) => boolean) =>
      rows.filter(predicate).length

    expect(count((r) => r.level === 'LOW' && r.portal.status === 'OPEN'), 'LOW + OPEN').toBeGreaterThanOrEqual(1)
    expect(count((r) => r.level === 'LOW' && r.portal.status === 'QUESTIONABLE'), 'LOW + QUESTIONABLE').toBeGreaterThanOrEqual(1)
    expect(count((r) => r.level === 'MEDIUM'), 'MEDIUM').toBeGreaterThanOrEqual(1)
    expect(count((r) => r.level === 'HIGH'), 'HIGH').toBeGreaterThanOrEqual(1)
    expect(count((r) => r.level === 'CRITICAL'), 'CRITICAL').toBeGreaterThanOrEqual(2)
    expect(count((r) => r.portal.status === 'CLOSED'), 'CLOSED').toBeGreaterThanOrEqual(1)
    expect(count((r) => r.level === 'CRITICAL' && r.portal.creaturesInside > 0), 'CRITICAL + существа').toBeGreaterThanOrEqual(1)
  })

  it('chronos-tear получает MEDIUM именно из-за скорого схлопывания', () => {
    const chronos = demoPortals.find((portal) => portal.id === 'chronos-tear')
    if (!chronos) throw new Error('chronos-tear отсутствует в demoPortals')

    expect(chronos.collapseMinutes).toBe(5)
    expect(calculateRisk(chronos).level).toBe('MEDIUM')
    // Те же стабильность и энергия без давления времени дали бы LOW.
    expect(calculateRisk({ ...chronos, collapseMinutes: 120 }).level).toBe('LOW')
  })
})
