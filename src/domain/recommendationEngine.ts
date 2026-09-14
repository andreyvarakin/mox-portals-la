import type { Portal } from './portal.ts'
import type { PortalRecommendation } from './recommendation.ts'
import { calculateRisk } from './riskEngine.ts'

/**
 * Определяет рекомендуемое решение по порталу.
 *
 * Правила по порядку:
 *   CLOSED                         → NO_ACTION
 *   CRITICAL, существ нет          → CLOSE
 *   CRITICAL, внутри есть существа → REVIEW_CREATURES
 *   HIGH                           → STABILIZE
 *   MEDIUM                         → STABILIZE (мягче по тексту)
 *   LOW + QUESTIONABLE             → MANUAL_REVIEW
 *   LOW + OPEN                     → KEEP_OPEN
 *
 * Уровень риска берётся только из calculateRisk. Для MEDIUM и выше риск
 * важнее ручной отметки QUESTIONABLE; отметка решает только при низком риске.
 * Существа внутри учитываются только при критическом риске.
 *
 * Чистая функция: Portal не изменяет и ничего над ним не выполняет. Если данные
 * активного портала некорректны, ошибка calculateRisk пробрасывается как есть.
 */
export function getPortalRecommendation(portal: Portal): PortalRecommendation {
  if (portal.status === 'CLOSED') {
    return { code: 'NO_ACTION', message: 'Портал закрыт — действий не требуется' }
  }

  const { level } = calculateRisk(portal)

  switch (level) {
    case 'CRITICAL':
      if (portal.creaturesInside > 0) {
        return {
          code: 'REVIEW_CREATURES',
          message:
            `Риск критический, но внутри остаются существа: ${portal.creaturesInside}. ` +
            'Перед закрытием нужно решить, что с ними делать.',
        }
      }
      return { code: 'CLOSE', message: 'Риск критический — рекомендуется закрыть портал' }

    case 'HIGH':
      return { code: 'STABILIZE', message: 'Риск высокий — рекомендуется стабилизировать портал' }

    case 'MEDIUM':
      return {
        code: 'STABILIZE',
        message: 'Риск умеренный — стабилизируйте портал и продолжайте наблюдение',
      }

    case 'LOW':
      if (portal.status === 'QUESTIONABLE') {
        return {
          code: 'MANUAL_REVIEW',
          message:
            'Автоматическая оценка риска низкая, но портал отмечен как требующий внимания — проверьте вручную',
        }
      }
      return { code: 'KEEP_OPEN', message: 'Риск низкий — портал можно оставить открытым' }
  }
}
