import type {
  PortalAction,
  PortalEventOutcome,
  PortalStatus,
  RiskLevel,
} from '../domain/index.ts'

/** Русские подписи для интерфейса. Это оформление, а не правила предметной области. */

export const STATUS_LABELS: Record<PortalStatus, string> = {
  OPEN: 'Открыт',
  QUESTIONABLE: 'Под вопросом',
  CLOSED: 'Закрыт',
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  CRITICAL: 'Критический',
}

export const ACTION_LABELS: Record<PortalAction, string> = {
  STABILIZE: 'Стабилизация',
  CLOSE: 'Закрытие',
  SEND_OBSERVER: 'Отправка наблюдателя',
  MARK_QUESTIONABLE: 'Пометка «под вопросом»',
  CLEAR_QUESTIONABLE: 'Снятие отметки',
}

export const OUTCOME_LABELS: Record<PortalEventOutcome, string> = {
  APPLIED: 'Выполнено',
  BLOCKED: 'Заблокировано',
  REQUIRES_CONFIRMATION: 'Требует подтверждения',
}
