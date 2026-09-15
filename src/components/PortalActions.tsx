import { getActionAvailability, type Portal, type PortalAction } from '../domain/index.ts'

/** Незавершённое подтверждение закрытия — состояние интерфейса, не предметной области. */
export interface PendingConfirmation {
  portalId: string
  action: 'CLOSE'
  warning: string
}

/** Подписи кнопок — глаголы. Названия событий для журнала — в labels.ts. */
const ACTION_BUTTON_LABELS: Record<PortalAction, string> = {
  STABILIZE: 'Стабилизировать',
  SEND_OBSERVER: 'Отправить наблюдателя',
  MARK_QUESTIONABLE: 'Пометить как «под вопросом»',
  CLEAR_QUESTIONABLE: 'Снять отметку «под вопросом»',
  CLOSE: 'Закрыть портал',
}

interface PortalActionsProps {
  portal: Portal
  /** Подтверждение для этого портала или null. */
  pendingConfirmation: PendingConfirmation | null
  onAction: (action: PortalAction) => void
  onConfirm: () => void
  onCancelConfirmation: () => void
}

export function PortalActions({
  portal,
  pendingConfirmation,
  onAction,
  onConfirm,
  onCancelConfirmation,
}: PortalActionsProps) {
  // Какую из двух отметок предложить, решает domain layer: снять отметку можно только там, где она есть.
  const questionableAction: PortalAction =
    getActionAvailability(portal, 'CLEAR_QUESTIONABLE').kind === 'ALLOWED'
      ? 'CLEAR_QUESTIONABLE'
      : 'MARK_QUESTIONABLE'
  const actions: PortalAction[] = ['STABILIZE', 'SEND_OBSERVER', questionableAction, 'CLOSE']

  return (
    <ul className="action-list">
      {actions.map((action) => {
        const isClose = action === 'CLOSE'

        // Пока подтверждение открыто, основная кнопка закрытия скрыта:
        // повторный клик не создаст ещё один запрос подтверждения.
        if (isClose && pendingConfirmation) {
          return (
            <li key={action} className="action action--danger">
              <div className="confirmation">
                <h5 className="confirmation__title">Подтвердите закрытие</h5>
                <p className="confirmation__warning">{pendingConfirmation.warning}</p>
                <div className="confirmation__buttons">
                  <button type="button" className="action-button" onClick={onCancelConfirmation}>
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="action-button action-button--danger"
                    onClick={onConfirm}
                  >
                    Закрыть всё равно
                  </button>
                </div>
              </div>
            </li>
          )
        }

        const availability = getActionAvailability(portal, action)
        const isBlocked = availability.kind === 'BLOCKED'

        return (
          <li key={action} className={isClose ? 'action action--danger' : 'action'}>
            <button
              type="button"
              className={isClose ? 'action-button action-button--danger' : 'action-button'}
              disabled={isBlocked}
              onClick={() => onAction(action)}
            >
              {ACTION_BUTTON_LABELS[action]}
            </button>
            {availability.kind === 'BLOCKED' && (
              <p className="action__reason">{availability.reason}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
