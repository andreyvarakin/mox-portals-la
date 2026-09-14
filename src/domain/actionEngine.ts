import type {
  ActionAvailability,
  ActionResult,
  ExecuteActionOptions,
} from './action.ts'
import type { PortalAction } from './event.ts'
import type { Portal } from './portal.ts'
import { calculateRisk } from './riskEngine.ts'

const STABILIZE_STABILITY_GAIN = 25
const STABILIZE_ENERGY_DROP = 10

/**
 * Проверяет, можно ли выполнить действие над порталом.
 *
 * Чистая функция: Portal не изменяет. Уровень риска для SEND_OBSERVER
 * берётся только из calculateRisk; если данные активного портала
 * некорректны, ошибка calculateRisk пробрасывается как есть.
 */
export function getActionAvailability(
  portal: Portal,
  action: PortalAction,
): ActionAvailability {
  switch (action) {
    case 'STABILIZE':
      if (portal.status === 'CLOSED') {
        return blocked('Закрытый портал нельзя стабилизировать')
      }
      return allowed()

    case 'CLOSE':
      if (portal.status === 'CLOSED') {
        return blocked('Портал уже закрыт')
      }
      if (portal.creaturesInside > 0) {
        return requiresConfirmation(
          `Внутри портала остаются существа: ${portal.creaturesInside}. ` +
            'После закрытия они могут остаться по другую сторону портала.',
        )
      }
      return allowed()

    case 'SEND_OBSERVER':
      if (portal.status === 'CLOSED') {
        return blocked('Нельзя отправить наблюдателя в закрытый портал')
      }
      if (calculateRisk(portal).level === 'CRITICAL') {
        return blocked('Риск портала критический — отправлять наблюдателя нельзя')
      }
      return allowed()

    case 'MARK_QUESTIONABLE':
      if (portal.status === 'CLOSED') {
        return blocked('Закрытый портал нельзя пометить как требующий внимания')
      }
      if (portal.status === 'QUESTIONABLE') {
        return blocked('Портал уже помечен как требующий внимания')
      }
      return allowed()

    case 'CLEAR_QUESTIONABLE':
      if (portal.status === 'CLOSED') {
        return blocked('У закрытого портала нельзя снять отметку «требует внимания»')
      }
      if (portal.status === 'OPEN') {
        return blocked('У портала нет отметки «требует внимания»')
      }
      return allowed()
  }
}

/**
 * Выполняет действие над порталом, если оно разрешено.
 *
 * Правила берутся только из getActionAvailability. Запрет и необходимость
 * подтверждения — ожидаемые исходы, а не исключения: в обоих случаях
 * возвращается исходный портал без изменений. Подтверждение засчитывается
 * только при confirmed === true и не отменяет запрет.
 *
 * Чистая функция: исходный Portal не изменяет; если действие меняет портал,
 * возвращается новый объект.
 */
export function executePortalAction(
  portal: Portal,
  action: PortalAction,
  options: ExecuteActionOptions = {},
): ActionResult {
  const availability = getActionAvailability(portal, action)

  if (availability.kind === 'BLOCKED') {
    return { outcome: 'BLOCKED', portal, reason: availability.reason }
  }
  if (availability.kind === 'REQUIRES_CONFIRMATION' && options.confirmed !== true) {
    return { outcome: 'REQUIRES_CONFIRMATION', portal, warning: availability.warning }
  }

  return { outcome: 'APPLIED', portal: applyTransition(portal, action) }
}

function applyTransition(portal: Portal, action: PortalAction): Portal {
  switch (action) {
    case 'STABILIZE':
      // Отметку QUESTIONABLE стабилизация не снимает: это ручное решение оператора.
      return {
        ...portal,
        stability: Math.min(100, portal.stability + STABILIZE_STABILITY_GAIN),
        energy: Math.max(0, portal.energy - STABILIZE_ENERGY_DROP),
      }

    case 'CLOSE':
      // creaturesInside не обнуляется: закрытие — не эвакуация.
      return { ...portal, status: 'CLOSED', collapseMinutes: null }

    case 'SEND_OBSERVER':
      // Портал физически не меняется; факт действия фиксирует журнал событий.
      return portal

    case 'MARK_QUESTIONABLE':
      return { ...portal, status: 'QUESTIONABLE' }

    case 'CLEAR_QUESTIONABLE':
      return { ...portal, status: 'OPEN' }
  }
}

function allowed(): ActionAvailability {
  return { kind: 'ALLOWED' }
}

function blocked(reason: string): ActionAvailability {
  return { kind: 'BLOCKED', reason }
}

function requiresConfirmation(warning: string): ActionAvailability {
  return { kind: 'REQUIRES_CONFIRMATION', warning }
}
