import { describe, expect, it } from 'vitest'
import {
  calculateRisk,
  executePortalAction,
  getActionAvailability,
  type ActionAvailability,
  type ActionResult,
  type Portal,
  type PortalAction,
  type PortalStatus,
} from '../domain/index.ts'

/** По умолчанию — открытый портал с умеренным риском (score 36, MEDIUM), без существ. */
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

/** Параметры критического риска: score 88. */
const CRITICAL_PARAMS = { stability: 18, energy: 91, collapseMinutes: 8 }

const STATUSES: PortalStatus[] = ['OPEN', 'QUESTIONABLE', 'CLOSED']
const ACTIONS: PortalAction[] = [
  'STABILIZE',
  'CLOSE',
  'SEND_OBSERVER',
  'MARK_QUESTIONABLE',
  'CLEAR_QUESTIONABLE',
]
const STATUS_ACTION_PAIRS = STATUSES.flatMap((status) =>
  ACTIONS.map((action): [PortalStatus, PortalAction] => [status, action]),
)

/** Портал с существами внутри; у закрытого нет времени до схлопывания. */
function portalInStatus(status: PortalStatus): Portal {
  return makePortal({
    status,
    creaturesInside: 5,
    collapseMinutes: status === 'CLOSED' ? null : 90,
  })
}

function expectAllowed(availability: ActionAvailability): void {
  expect(availability).toEqual({ kind: 'ALLOWED' })
}

function expectBlocked(availability: ActionAvailability): void {
  expect(availability.kind).toBe('BLOCKED')
  if (availability.kind === 'BLOCKED') {
    expect(availability.reason.trim()).not.toBe('')
  }
}

function expectConfirmationRequired(availability: ActionAvailability): void {
  expect(availability.kind).toBe('REQUIRES_CONFIRMATION')
  if (availability.kind === 'REQUIRES_CONFIRMATION') {
    expect(availability.warning.trim()).not.toBe('')
  }
}

function expectApplied(result: ActionResult): Portal {
  if (result.outcome !== 'APPLIED') {
    throw new Error(`Ожидался исход APPLIED, получен ${result.outcome}`)
  }
  return result.portal
}

describe('STABILIZE', () => {
  it('OPEN можно стабилизировать', () => {
    expectAllowed(getActionAvailability(makePortal(), 'STABILIZE'))
  })

  it('QUESTIONABLE можно стабилизировать', () => {
    expectAllowed(getActionAvailability(makePortal({ status: 'QUESTIONABLE' }), 'STABILIZE'))
  })

  it('CLOSED нельзя стабилизировать', () => {
    const portal = makePortal({ status: 'CLOSED', collapseMinutes: null })

    expectBlocked(getActionAvailability(portal, 'STABILIZE'))
    expect(executePortalAction(portal, 'STABILIZE').outcome).toBe('BLOCKED')
  })

  it('stability увеличивается на 25', () => {
    const result = expectApplied(executePortalAction(makePortal({ stability: 60 }), 'STABILIZE'))

    expect(result.stability).toBe(85)
  })

  it('stability не превышает 100', () => {
    const result = expectApplied(executePortalAction(makePortal({ stability: 90 }), 'STABILIZE'))

    expect(result.stability).toBe(100)
  })

  it('energy уменьшается на 10', () => {
    const result = expectApplied(executePortalAction(makePortal({ energy: 40 }), 'STABILIZE'))

    expect(result.energy).toBe(30)
  })

  it('energy не падает ниже 0', () => {
    const result = expectApplied(executePortalAction(makePortal({ energy: 5 }), 'STABILIZE'))

    expect(result.energy).toBe(0)
  })

  it('QUESTIONABLE после стабилизации остаётся QUESTIONABLE', () => {
    const portal = makePortal({ status: 'QUESTIONABLE' })

    expect(expectApplied(executePortalAction(portal, 'STABILIZE')).status).toBe('QUESTIONABLE')
  })

  it('меняются только stability и energy', () => {
    const portal = makePortal({ creaturesInside: 4 })

    expect(expectApplied(executePortalAction(portal, 'STABILIZE'))).toEqual({
      ...portal,
      stability: 85,
      energy: 30,
    })
  })

  it('разрешена и при stability 100 и energy 0', () => {
    const portal = makePortal({ stability: 100, energy: 0 })

    expectAllowed(getActionAvailability(portal, 'STABILIZE'))
    expect(expectApplied(executePortalAction(portal, 'STABILIZE'))).toEqual(portal)
  })

  it('снижает риск: критический портал становится HIGH, и наблюдателя уже можно отправить', () => {
    const portal = makePortal(CRITICAL_PARAMS)
    expect(calculateRisk(portal).level).toBe('CRITICAL')
    expectBlocked(getActionAvailability(portal, 'SEND_OBSERVER'))

    const stabilized = expectApplied(executePortalAction(portal, 'STABILIZE'))
    const risk = calculateRisk(stabilized)

    expect(risk.score).toBeLessThan(calculateRisk(portal).score)
    expect(risk.level).toBe('HIGH')
    expectAllowed(getActionAvailability(stabilized, 'SEND_OBSERVER'))
  })
})

describe('CLOSE', () => {
  it('OPEN без существ закрывается сразу', () => {
    const portal = makePortal()

    expectAllowed(getActionAvailability(portal, 'CLOSE'))
    expect(executePortalAction(portal, 'CLOSE').outcome).toBe('APPLIED')
  })

  it('QUESTIONABLE без существ закрывается', () => {
    const portal = makePortal({ status: 'QUESTIONABLE' })

    expectAllowed(getActionAvailability(portal, 'CLOSE'))
    expect(expectApplied(executePortalAction(portal, 'CLOSE')).status).toBe('CLOSED')
  })

  it('CLOSED нельзя закрыть повторно', () => {
    const portal = makePortal({ status: 'CLOSED', collapseMinutes: null })

    expectBlocked(getActionAvailability(portal, 'CLOSE'))
    expect(executePortalAction(portal, 'CLOSE').outcome).toBe('BLOCKED')
  })

  it('при существах внутри требуется подтверждение', () => {
    expectConfirmationRequired(getActionAvailability(makePortal({ creaturesInside: 3 }), 'CLOSE'))
  })

  it.each([
    ['без опций', undefined],
    ['с confirmed: false', { confirmed: false }],
  ])('%s возвращается REQUIRES_CONFIRMATION с предупреждением', (_label, options) => {
    const result = executePortalAction(makePortal({ creaturesInside: 3 }), 'CLOSE', options)

    expect(result.outcome).toBe('REQUIRES_CONFIRMATION')
    if (result.outcome === 'REQUIRES_CONFIRMATION') {
      expect(result.warning.trim()).not.toBe('')
    }
  })

  it('с confirmed: true портал закрывается', () => {
    const result = executePortalAction(makePortal({ creaturesInside: 3 }), 'CLOSE', {
      confirmed: true,
    })

    expect(result.outcome).toBe('APPLIED')
  })

  it('после закрытия status === CLOSED', () => {
    expect(expectApplied(executePortalAction(makePortal(), 'CLOSE')).status).toBe('CLOSED')
  })

  it('после закрытия collapseMinutes === null', () => {
    const result = expectApplied(executePortalAction(makePortal({ collapseMinutes: 45 }), 'CLOSE'))

    expect(result.collapseMinutes).toBeNull()
  })

  it('creaturesInside после закрытия не изменяется', () => {
    const result = expectApplied(
      executePortalAction(makePortal({ creaturesInside: 3 }), 'CLOSE', { confirmed: true }),
    )

    expect(result.creaturesInside).toBe(3)
  })

  it('меняются только status и collapseMinutes', () => {
    const portal = makePortal({ status: 'QUESTIONABLE', creaturesInside: 2 })

    expect(expectApplied(executePortalAction(portal, 'CLOSE', { confirmed: true }))).toEqual({
      ...portal,
      status: 'CLOSED',
      collapseMinutes: null,
    })
  })

  it('подтверждение не отменяет запрет: закрытый портал с существами остаётся BLOCKED', () => {
    const portal = makePortal({ status: 'CLOSED', collapseMinutes: null, creaturesInside: 3 })

    expectBlocked(getActionAvailability(portal, 'CLOSE'))
    expect(executePortalAction(portal, 'CLOSE', { confirmed: true }).outcome).toBe('BLOCKED')
  })

  it.each([
    ['строка "true"', 'true'],
    ['число 1', 1],
  ])('confirmed = %s не считается подтверждением', (_label, value) => {
    const result = executePortalAction(makePortal({ creaturesInside: 3 }), 'CLOSE', {
      confirmed: value as unknown as boolean,
    })

    expect(result.outcome).toBe('REQUIRES_CONFIRMATION')
  })
})

describe('SEND_OBSERVER', () => {
  it('для некритического OPEN разрешён', () => {
    expectAllowed(getActionAvailability(makePortal(), 'SEND_OBSERVER'))
  })

  it('для некритического QUESTIONABLE разрешён', () => {
    expectAllowed(getActionAvailability(makePortal({ status: 'QUESTIONABLE' }), 'SEND_OBSERVER'))
  })

  it('для CRITICAL запрещён', () => {
    const portal = makePortal(CRITICAL_PARAMS)

    expectBlocked(getActionAvailability(portal, 'SEND_OBSERVER'))
    expect(executePortalAction(portal, 'SEND_OBSERVER').outcome).toBe('BLOCKED')
  })

  it('для CLOSED запрещён', () => {
    const portal = makePortal({ status: 'CLOSED', collapseMinutes: null })

    expectBlocked(getActionAvailability(portal, 'SEND_OBSERVER'))
  })

  it('разрешённый SEND_OBSERVER не меняет значения портала', () => {
    const portal = makePortal({ status: 'QUESTIONABLE', creaturesInside: 2 })
    const snapshot = structuredClone(portal)

    expect(expectApplied(executePortalAction(portal, 'SEND_OBSERVER'))).toEqual(snapshot)
  })

  it.each<[number, string, ActionAvailability['kind']]>([
    [101, 'HIGH', 'ALLOWED'],
    [96, 'CRITICAL', 'BLOCKED'],
  ])(
    'граница уровня: collapseMinutes=%d → риск %s → %s',
    (collapseMinutes, level, kind) => {
      const portal = makePortal({ stability: 0, energy: 100, collapseMinutes })

      expect(calculateRisk(portal).level).toBe(level)
      expect(getActionAvailability(portal, 'SEND_OBSERVER').kind).toBe(kind)
    },
  )

  it('некорректные данные активного портала — ошибка calculateRisk, а не BLOCKED', () => {
    const portal = makePortal({ collapseMinutes: null })

    expect(() => getActionAvailability(portal, 'SEND_OBSERVER')).toThrow(Error)
  })
})

describe('MARK_QUESTIONABLE и CLEAR_QUESTIONABLE', () => {
  it('OPEN можно пометить как QUESTIONABLE', () => {
    expectAllowed(getActionAvailability(makePortal(), 'MARK_QUESTIONABLE'))
  })

  it('после MARK_QUESTIONABLE статус QUESTIONABLE, остальное не меняется', () => {
    const portal = makePortal()

    expect(expectApplied(executePortalAction(portal, 'MARK_QUESTIONABLE'))).toEqual({
      ...portal,
      status: 'QUESTIONABLE',
    })
  })

  it('повторный MARK_QUESTIONABLE для QUESTIONABLE блокируется', () => {
    expectBlocked(
      getActionAvailability(makePortal({ status: 'QUESTIONABLE' }), 'MARK_QUESTIONABLE'),
    )
  })

  it('с QUESTIONABLE можно снять отметку', () => {
    expectAllowed(
      getActionAvailability(makePortal({ status: 'QUESTIONABLE' }), 'CLEAR_QUESTIONABLE'),
    )
  })

  it('после CLEAR_QUESTIONABLE статус OPEN, остальное не меняется', () => {
    const portal = makePortal({ status: 'QUESTIONABLE' })

    expect(expectApplied(executePortalAction(portal, 'CLEAR_QUESTIONABLE'))).toEqual({
      ...portal,
      status: 'OPEN',
    })
  })

  it('CLEAR_QUESTIONABLE для OPEN блокируется', () => {
    expectBlocked(getActionAvailability(makePortal(), 'CLEAR_QUESTIONABLE'))
  })

  it.each<PortalAction>(['MARK_QUESTIONABLE', 'CLEAR_QUESTIONABLE'])(
    '%s для CLOSED блокируется',
    (action) => {
      expectBlocked(
        getActionAvailability(makePortal({ status: 'CLOSED', collapseMinutes: null }), action),
      )
    },
  )
})

describe('общие инварианты', () => {
  it.each(STATUS_ACTION_PAIRS)('%s + %s: исходный портал не мутируется', (status, action) => {
    const portal = Object.freeze(portalInStatus(status))
    const snapshot = structuredClone(portal)

    getActionAvailability(portal, action)
    executePortalAction(portal, action)
    executePortalAction(portal, action, { confirmed: true })

    expect(portal).toEqual(snapshot)
  })

  it.each<[string, Portal, PortalAction]>([
    ['STABILIZE закрытого', makePortal({ status: 'CLOSED', collapseMinutes: null }), 'STABILIZE'],
    ['CLOSE закрытого', makePortal({ status: 'CLOSED', collapseMinutes: null }), 'CLOSE'],
    ['SEND_OBSERVER в закрытый', makePortal({ status: 'CLOSED', collapseMinutes: null }), 'SEND_OBSERVER'],
    ['SEND_OBSERVER при критическом риске', makePortal(CRITICAL_PARAMS), 'SEND_OBSERVER'],
    ['MARK_QUESTIONABLE повторно', makePortal({ status: 'QUESTIONABLE' }), 'MARK_QUESTIONABLE'],
    ['MARK_QUESTIONABLE закрытого', makePortal({ status: 'CLOSED', collapseMinutes: null }), 'MARK_QUESTIONABLE'],
    ['CLEAR_QUESTIONABLE без отметки', makePortal(), 'CLEAR_QUESTIONABLE'],
    ['CLEAR_QUESTIONABLE закрытого', makePortal({ status: 'CLOSED', collapseMinutes: null }), 'CLEAR_QUESTIONABLE'],
  ])('%s: заблокированное действие не меняет портал, даже с confirmed: true', (_label, portal, action) => {
    const snapshot = structuredClone(portal)

    for (const options of [undefined, { confirmed: true }]) {
      const result = executePortalAction(portal, action, options)

      expect(result.outcome).toBe('BLOCKED')
      if (result.outcome === 'BLOCKED') {
        expect(result.reason.trim()).not.toBe('')
      }
      expect(result.portal).toBe(portal)
      expect(portal).toEqual(snapshot)
    }
  })

  it('действие, требующее подтверждения, без подтверждения не меняет портал', () => {
    const portal = makePortal({ creaturesInside: 3 })
    const snapshot = structuredClone(portal)

    const result = executePortalAction(portal, 'CLOSE')

    expect(result.portal).toBe(portal)
    expect(portal).toEqual(snapshot)
  })

  it.each(STATUS_ACTION_PAIRS)(
    '%s + %s: исход выполнения совпадает с результатом проверки',
    (status, action) => {
      const portal = portalInStatus(status)
      const expectedOutcome = {
        ALLOWED: 'APPLIED',
        BLOCKED: 'BLOCKED',
        REQUIRES_CONFIRMATION: 'REQUIRES_CONFIRMATION',
      }[getActionAvailability(portal, action).kind]

      expect(executePortalAction(portal, action).outcome).toBe(expectedOutcome)
    },
  )

  it('на одинаковых аргументах возвращает одинаковый результат', () => {
    const portal = makePortal({ creaturesInside: 3 })

    for (const action of ACTIONS) {
      expect(getActionAvailability(portal, action)).toEqual(getActionAvailability(portal, action))
      expect(executePortalAction(portal, action)).toEqual(executePortalAction(portal, action))
    }
  })
})
