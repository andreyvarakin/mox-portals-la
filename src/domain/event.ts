import type { PortalStatus } from './portal.ts'
import type { RiskLevel } from './risk.ts'

/** Действие оператора над порталом. */
export type PortalAction =
  | 'STABILIZE'
  | 'CLOSE'
  | 'SEND_OBSERVER'
  | 'MARK_QUESTIONABLE'
  | 'CLEAR_QUESTIONABLE'

/** Исход действия, записанный в журнал. */
export type PortalEventOutcome = 'APPLIED' | 'BLOCKED' | 'REQUIRES_CONFIRMATION'

/**
 * Снимок состояния портала на момент события.
 *
 * id, name и destinationWorld не дублируются — портал определяется через portalId.
 * riskScore и riskLevel — исторические значения для журнала: в самом Portal
 * риск не хранится, а вычисляется.
 */
export interface PortalSnapshot {
  status: PortalStatus
  energy: number
  stability: number
  collapseMinutes: number | null
  creaturesInside: number
  riskScore: number
  riskLevel: RiskLevel
}

/** Запись журнала событий. */
export interface PortalEvent {
  id: string
  portalId: string
  /** Момент события, строка в формате ISO 8601. */
  timestamp: string
  action: PortalAction
  outcome: PortalEventOutcome
  message: string
  /** Состояние портала до действия. */
  before: PortalSnapshot
  /**
   * Состояние после действия. Совпадает с before, если действие не применено
   * (BLOCKED, REQUIRES_CONFIRMATION) или не меняет портал (SEND_OBSERVER).
   */
  after: PortalSnapshot
}
