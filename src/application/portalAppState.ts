import {
  calculateRisk,
  executePortalAction,
  type ActionResult,
  type Portal,
  type PortalAction,
  type PortalEvent,
  type PortalSnapshot,
} from '../domain/index.ts'

/** Состояние приложения: рабочий список порталов и журнал событий (старые → новые). */
export interface PortalAppState {
  portals: readonly Portal[]
  events: readonly PortalEvent[]
}

/**
 * Команда оператора над порталом.
 *
 * eventId и timestamp задаёт вызывающий код: слой приложения не читает часы
 * и не генерирует идентификаторы, поэтому результат детерминирован.
 */
export interface PortalCommand {
  portalId: string
  action: PortalAction
  /** Подтверждение; нужно только для CLOSE, когда внутри есть существа. */
  confirmed?: boolean
  eventId: string
  /** Момент команды, строка в формате ISO 8601 (формат не проверяется). */
  timestamp: string
}

const APPLIED_MESSAGES: Record<PortalAction, string> = {
  STABILIZE: 'Портал стабилизирован',
  CLOSE: 'Портал закрыт',
  SEND_OBSERVER: 'Наблюдатель отправлен',
  MARK_QUESTIONABLE: 'Портал помечен как требующий внимания',
  CLEAR_QUESTIONABLE: 'Отметка «под вопросом» снята',
}

/**
 * Создаёт начальное состояние из исходных порталов.
 * Массив и объекты копируются, исходные данные не изменяются. Пустой список допустим.
 */
export function createInitialPortalState(portals: readonly Portal[]): PortalAppState {
  return {
    portals: portals.map((portal) => ({ ...portal })),
    events: [],
  }
}

/**
 * Применяет команду к состоянию и записывает событие в журнал.
 *
 * Правила действий берутся из executePortalAction, риск для снимков — из
 * calculateRisk. Запрет и запрос подтверждения тоже попадают в журнал,
 * но порталы при этом не меняются.
 *
 * Чистая функция: входные state и command не изменяются, возвращается новое состояние.
 *
 * @throws Error, если портала с command.portalId нет в состоянии (событие не создаётся).
 */
export function applyPortalCommand(
  state: PortalAppState,
  command: PortalCommand,
): PortalAppState {
  const index = state.portals.findIndex((portal) => portal.id === command.portalId)
  if (index === -1) {
    throw new Error(`Портал с id «${command.portalId}» не найден`)
  }

  const portal = state.portals[index]
  const before = takeSnapshot(portal)
  const result = executePortalAction(portal, command.action, {
    confirmed: command.confirmed,
  })

  const event: PortalEvent = {
    id: command.eventId,
    portalId: portal.id,
    timestamp: command.timestamp,
    action: command.action,
    outcome: result.outcome,
    message: eventMessage(result, command.action),
    before,
    after: takeSnapshot(result.portal),
  }

  const portals =
    result.outcome === 'APPLIED'
      ? state.portals.map((current, i) => (i === index ? result.portal : current))
      : state.portals

  return { portals, events: [...state.events, event] }
}

function takeSnapshot(portal: Portal): PortalSnapshot {
  const { score, level } = calculateRisk(portal)

  return {
    status: portal.status,
    energy: portal.energy,
    stability: portal.stability,
    collapseMinutes: portal.collapseMinutes,
    creaturesInside: portal.creaturesInside,
    riskScore: score,
    riskLevel: level,
  }
}

function eventMessage(result: ActionResult, action: PortalAction): string {
  switch (result.outcome) {
    case 'APPLIED':
      return APPLIED_MESSAGES[action]
    case 'BLOCKED':
      return result.reason
    case 'REQUIRES_CONFIRMATION':
      return result.warning
  }
}
