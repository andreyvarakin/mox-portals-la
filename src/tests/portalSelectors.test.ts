import { describe, expect, it } from 'vitest'
import { getPortalSummary, type AttentionKind } from '../application/index.ts'
import { demoPortals } from '../data/index.ts'
import { calculateRisk, type Portal, type RiskLevel } from '../domain/index.ts'

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

// Параметры на каждый уровень риска; фактический уровень проверяется в тестах.
const LOW = { stability: 80, energy: 20, collapseMinutes: 120 } // score 15
const MEDIUM = { stability: 60, energy: 40, collapseMinutes: 90 } // score 36
const HIGH = { stability: 30, energy: 70, collapseMinutes: 60 } // score 65
const CRITICAL = { stability: 18, energy: 91, collapseMinutes: 8 } // score 88

/** Замораживает объект целиком: любая попытка мутации бросит TypeError. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value as object)) deepFreeze(nested)
  }
  return value
}

describe('getPortalSummary на demoPortals', () => {
  it('считает открытые, критичные и закрытые', () => {
    const { openCount, criticalCount, closedCount } = getPortalSummary(demoPortals)

    expect({ openCount, criticalCount, closedCount }).toEqual({
      openCount: 7,
      criticalCount: 2,
      closedCount: 1,
    })
  })

  it('список внимания: ровно ожидаемые порталы, виды, score и порядок', () => {
    const { attention } = getPortalSummary(demoPortals)

    expect(attention.map(({ portalId, kind, riskScore }) => ({ portalId, kind, riskScore }))).toEqual([
      { portalId: 'abyss-gate', kind: 'CRITICAL', riskScore: 88 },
      { portalId: 'void-maw', kind: 'CRITICAL', riskScore: 85 },
      { portalId: 'ash-rift', kind: 'HIGH', riskScore: 66 },
      { portalId: 'mirror-passage', kind: 'QUESTIONABLE', riskScore: 13 },
      { portalId: 'chronos-tear', kind: 'MEDIUM', riskScore: 49 },
      { portalId: 'lumia-rift', kind: 'MEDIUM', riskScore: 36 },
    ])
    // aurora-gate (LOW + OPEN) и erebus-node (CLOSED) не попадают — это следует из точного
    // совпадения выше; проверка ниже делает причину явной.
    const ids = attention.map((item) => item.portalId)
    expect(ids).not.toContain('aurora-gate')
    expect(ids).not.toContain('erebus-node')
  })
})

describe('getPortalSummary: вид внимания', () => {
  it.each<[string, RiskLevel, AttentionKind | null, Partial<Portal>]>([
    ['LOW + OPEN', 'LOW', null, LOW],
    ['LOW + QUESTIONABLE', 'LOW', 'QUESTIONABLE', { ...LOW, status: 'QUESTIONABLE' }],
    ['MEDIUM + OPEN', 'MEDIUM', 'MEDIUM', MEDIUM],
    ['MEDIUM + QUESTIONABLE', 'MEDIUM', 'QUESTIONABLE', { ...MEDIUM, status: 'QUESTIONABLE' }],
    ['HIGH + QUESTIONABLE', 'HIGH', 'HIGH', { ...HIGH, status: 'QUESTIONABLE' }],
    ['CRITICAL + QUESTIONABLE', 'CRITICAL', 'CRITICAL', { ...CRITICAL, status: 'QUESTIONABLE' }],
  ])('%s: риск %s → %s', (_label, level, kind, overrides) => {
    const portal = makePortal(overrides)
    expect(calculateRisk(portal).level).toBe(level)

    const { attention } = getPortalSummary([portal])

    expect(attention.map((item) => item.kind)).toEqual(kind === null ? [] : [kind])
  })

  it('закрытый портал с опасными параметрами не критичен и не требует внимания', () => {
    const closed = makePortal({ ...CRITICAL, status: 'CLOSED', collapseMinutes: null, creaturesInside: 3 })

    expect(getPortalSummary([closed])).toEqual({
      openCount: 0,
      criticalCount: 0,
      closedCount: 1,
      attention: [],
    })
  })

  it('пустой список даёт нули и пустой список внимания', () => {
    expect(getPortalSummary([])).toEqual({
      openCount: 0,
      criticalCount: 0,
      closedCount: 0,
      attention: [],
    })
  })
})

describe('getPortalSummary: порядок и неизменность', () => {
  it('внутри одного вида — по убыванию riskScore', () => {
    const portals = [
      makePortal({ id: 'high-60', stability: 0, energy: 50, collapseMinutes: 120 }),
      makePortal({ id: 'high-65', ...HIGH }),
    ]

    const { attention } = getPortalSummary(portals)

    expect(attention.map(({ portalId, kind, riskScore }) => ({ portalId, kind, riskScore }))).toEqual([
      { portalId: 'high-65', kind: 'HIGH', riskScore: 65 },
      { portalId: 'high-60', kind: 'HIGH', riskScore: 60 },
    ])
  })

  it('при полном равенстве сохраняется исходный порядок', () => {
    const first = makePortal({ id: 'first', ...MEDIUM })
    const second = makePortal({ id: 'second', ...MEDIUM })

    const ids = (portals: Portal[]) => getPortalSummary(portals).attention.map((item) => item.portalId)

    expect(ids([first, second])).toEqual(['first', 'second'])
    expect(ids([second, first])).toEqual(['second', 'first'])
  })

  it('не сортирует и не мутирует исходный массив и порталы', () => {
    const portals = deepFreeze([...demoPortals].reverse().map((portal) => ({ ...portal })))
    const snapshot = structuredClone(portals)

    getPortalSummary(portals)

    expect(portals).toEqual(snapshot)
  })
})
