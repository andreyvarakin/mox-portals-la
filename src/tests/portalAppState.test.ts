import { describe, expect, it } from 'vitest'
import {
  applyPortalCommand,
  createInitialPortalState,
  type PortalAppState,
  type PortalCommand,
} from '../application/index.ts'
import { demoPortals } from '../data/index.ts'
import { executePortalAction, type Portal, type PortalAction } from '../domain/index.ts'

const T1 = '2026-09-15T10:00:00.000Z'
const T2 = '2026-09-15T10:05:00.000Z'
const T3 = '2026-09-15T10:10:00.000Z'

function command(
  portalId: string,
  action: PortalAction,
  extra: Partial<PortalCommand> = {},
): PortalCommand {
  return { portalId, action, eventId: 'evt-1', timestamp: T1, ...extra }
}

function portalById(state: PortalAppState, id: string): Portal {
  const portal = state.portals.find((candidate) => candidate.id === id)
  if (!portal) throw new Error(`В состоянии нет портала ${id}`)
  return portal
}

/** Замораживает объект целиком: любая попытка мутации бросит TypeError. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const nested of Object.values(value as object)) deepFreeze(nested)
  }
  return value
}

describe('createInitialPortalState', () => {
  it('из demoPortals: 8 копий порталов, пустой журнал, исходные данные не меняются', () => {
    const seed = structuredClone(demoPortals)

    const state = createInitialPortalState(demoPortals)

    expect(state.portals).toHaveLength(8)
    expect(state.events).toEqual([])
    expect(state.portals).toEqual(demoPortals)
    expect(state.portals).not.toBe(demoPortals)
    state.portals.forEach((portal, i) => expect(portal).not.toBe(demoPortals[i]))

    state.portals[0].energy = 99
    expect(demoPortals).toEqual(seed)
  })

  it('пустой список даёт пустое состояние без порталов и событий', () => {
    expect(createInitialPortalState([])).toEqual({ portals: [], events: [] })
  })
})

describe('applyPortalCommand', () => {
  it('STABILIZE: портал меняется, событие APPLIED со снимками риска до и после', () => {
    const state = createInitialPortalState(demoPortals)

    const next = applyPortalCommand(state, command('abyss-gate', 'STABILIZE', { eventId: 'evt-42', timestamp: T2 }))

    const abyss = portalById(next, 'abyss-gate')
    expect(abyss.stability).toBe(43)
    expect(abyss.energy).toBe(81)

    expect(next.events).toHaveLength(1)
    const [event] = next.events
    expect(event).toMatchObject({
      id: 'evt-42',
      portalId: 'abyss-gate',
      timestamp: T2,
      action: 'STABILIZE',
      outcome: 'APPLIED',
    })
    expect(event.message.trim()).not.toBe('')
    expect(event.before).toMatchObject({ stability: 18, energy: 91, riskScore: 88, riskLevel: 'CRITICAL' })
    expect(event.after).toMatchObject({ stability: 43, energy: 81, riskScore: 73, riskLevel: 'HIGH' })
    expect(Object.keys(event.before).sort()).toEqual(
      ['collapseMinutes', 'creaturesInside', 'energy', 'riskLevel', 'riskScore', 'stability', 'status'],
    )

    // Остальные порталы — те же объекты, что и до команды.
    for (const other of next.portals.filter((portal) => portal.id !== 'abyss-gate')) {
      expect(other).toBe(portalById(state, other.id))
    }
  })

  it('запрещённое действие: портал не меняется, событие BLOCKED с причиной из action engine', () => {
    const state = createInitialPortalState(demoPortals)
    const abyss = portalById(state, 'abyss-gate')

    const next = applyPortalCommand(state, command('abyss-gate', 'SEND_OBSERVER'))

    expect(next.portals).toEqual(state.portals)
    expect(next.events).toHaveLength(1)
    const [event] = next.events
    expect(event.outcome).toBe('BLOCKED')
    expect(event.after).toEqual(event.before)
    expect(event.message.trim()).not.toBe('')

    const domainResult = executePortalAction(abyss, 'SEND_OBSERVER')
    expect(domainResult.outcome === 'BLOCKED' && domainResult.reason).toBe(event.message)
  })

  it('CLOSE с существами без подтверждения: портал открыт, событие REQUIRES_CONFIRMATION', () => {
    const state = createInitialPortalState(demoPortals)
    const voidMaw = portalById(state, 'void-maw')

    const next = applyPortalCommand(state, command('void-maw', 'CLOSE'))

    expect(portalById(next, 'void-maw')).toMatchObject({ status: 'OPEN', creaturesInside: 4 })
    const [event] = next.events
    expect(event.outcome).toBe('REQUIRES_CONFIRMATION')
    expect(event.after).toEqual(event.before)

    const domainResult = executePortalAction(voidMaw, 'CLOSE')
    expect(domainResult.outcome === 'REQUIRES_CONFIRMATION' && domainResult.warning).toBe(event.message)
  })

  it('подтверждённый CLOSE отдельной командой: портал закрыт, в журнале два события', () => {
    const initial = createInitialPortalState(demoPortals)

    const asked = applyPortalCommand(initial, command('void-maw', 'CLOSE', { eventId: 'evt-1', timestamp: T1 }))
    const closed = applyPortalCommand(
      asked,
      command('void-maw', 'CLOSE', { confirmed: true, eventId: 'evt-2', timestamp: T2 }),
    )

    expect(portalById(closed, 'void-maw')).toMatchObject({
      status: 'CLOSED',
      collapseMinutes: null,
      creaturesInside: 4,
    })
    expect(closed.events.map(({ id, outcome }) => ({ id, outcome }))).toEqual([
      { id: 'evt-1', outcome: 'REQUIRES_CONFIRMATION' },
      { id: 'evt-2', outcome: 'APPLIED' },
    ])
    expect(closed.events[1].after).toMatchObject({ status: 'CLOSED', riskScore: 0, riskLevel: 'LOW' })
  })

  it('SEND_OBSERVER в разрешённый портал: событие APPLIED, портал и снимок не меняются', () => {
    const state = createInitialPortalState(demoPortals)

    const next = applyPortalCommand(state, command('lumia-rift', 'SEND_OBSERVER'))

    expect(portalById(next, 'lumia-rift')).toEqual(portalById(state, 'lumia-rift'))
    const [event] = next.events
    expect(event.outcome).toBe('APPLIED')
    expect(event.after).toEqual(event.before)
  })

  it('MARK_QUESTIONABLE: OPEN → QUESTIONABLE, событие APPLIED', () => {
    const state = createInitialPortalState(demoPortals)

    const next = applyPortalCommand(state, command('aurora-gate', 'MARK_QUESTIONABLE'))

    expect(portalById(next, 'aurora-gate').status).toBe('QUESTIONABLE')
    const [event] = next.events
    expect(event.outcome).toBe('APPLIED')
    expect(event.before.status).toBe('OPEN')
    expect(event.after.status).toBe('QUESTIONABLE')
  })

  it('журнал после нескольких операций хранит события в порядке команд', () => {
    const commands = [
      command('aurora-gate', 'MARK_QUESTIONABLE', { eventId: 'evt-1', timestamp: T1 }),
      command('ash-rift', 'STABILIZE', { eventId: 'evt-2', timestamp: T2 }),
      command('abyss-gate', 'SEND_OBSERVER', { eventId: 'evt-3', timestamp: T3 }),
    ]

    const state = commands.reduce(applyPortalCommand, createInitialPortalState(demoPortals))

    expect(
      state.events.map(({ id, timestamp, portalId, action, outcome }) => ({
        id,
        timestamp,
        portalId,
        action,
        outcome,
      })),
    ).toEqual([
      { id: 'evt-1', timestamp: T1, portalId: 'aurora-gate', action: 'MARK_QUESTIONABLE', outcome: 'APPLIED' },
      { id: 'evt-2', timestamp: T2, portalId: 'ash-rift', action: 'STABILIZE', outcome: 'APPLIED' },
      { id: 'evt-3', timestamp: T3, portalId: 'abyss-gate', action: 'SEND_OBSERVER', outcome: 'BLOCKED' },
    ])
  })

  it('несуществующий портал: ошибка с его id, состояние не меняется, событие не создаётся', () => {
    const state = deepFreeze(createInitialPortalState(demoPortals))
    const snapshot = structuredClone(state)

    expect(() => applyPortalCommand(state, command('missing-portal', 'STABILIZE'))).toThrow(
      /missing-portal/,
    )
    expect(state).toEqual(snapshot)
    expect(state.events).toHaveLength(0)
  })

  it('не мутирует предыдущее состояние, команды и demoPortals', () => {
    const seed = structuredClone(demoPortals)
    const initial = deepFreeze(createInitialPortalState(demoPortals))
    const initialSnapshot = structuredClone(initial)

    const first = applyPortalCommand(initial, deepFreeze(command('abyss-gate', 'STABILIZE', { eventId: 'evt-1' })))
    const firstSnapshot = structuredClone(first)
    deepFreeze(first)
    const second = applyPortalCommand(first, deepFreeze(command('void-maw', 'CLOSE', { eventId: 'evt-2' })))
    applyPortalCommand(second, deepFreeze(command('erebus-node', 'STABILIZE', { eventId: 'evt-3' })))

    expect(initial).toEqual(initialSnapshot)
    expect(first).toEqual(firstSnapshot)
    expect(first).not.toBe(initial)
    expect(first.events).not.toBe(initial.events)
    expect(demoPortals).toEqual(seed)
  })
})
