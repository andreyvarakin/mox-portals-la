/** Действие оператора над порталом. */
export type PortalAction =
  | 'STABILIZE'
  | 'CLOSE'
  | 'SEND_OBSERVER'
  | 'MARK_QUESTIONABLE'
  | 'CLEAR_QUESTIONABLE'

/** Запись журнала событий. */
export interface PortalEvent {
  id: string
  portalId: string
  /** Момент события, строка в формате ISO 8601. */
  timestamp: string
  action: PortalAction
  message: string
}
