import type { Portal } from './portal.ts'

/** Можно ли выполнить действие над порталом. Варианты различаются по полю kind. */
export type ActionAvailability =
  | { kind: 'ALLOWED' }
  | { kind: 'BLOCKED'; reason: string }
  | { kind: 'REQUIRES_CONFIRMATION'; warning: string }

/** Параметры выполнения действия. */
export interface ExecuteActionOptions {
  /**
   * Явное подтверждение оператора. Учитывается только для действий,
   * требующих подтверждения; засчитывается лишь значение true.
   */
  confirmed?: boolean
}

/** Результат выполнения действия. Варианты различаются по полю outcome. */
export type ActionResult =
  | {
      outcome: 'APPLIED'
      /** Портал после действия. */
      portal: Portal
    }
  | {
      outcome: 'BLOCKED'
      /** Исходный портал без изменений. */
      portal: Portal
      reason: string
    }
  | {
      outcome: 'REQUIRES_CONFIRMATION'
      /** Исходный портал без изменений. */
      portal: Portal
      warning: string
    }
