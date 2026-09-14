/**
 * Код рекомендации для портала.
 *
 * Это не PortalAction: часть рекомендаций не является исполняемым
 * действием (KEEP_OPEN, MANUAL_REVIEW, REVIEW_CREATURES, NO_ACTION).
 */
export type RecommendationCode =
  | 'NO_ACTION'
  | 'KEEP_OPEN'
  | 'STABILIZE'
  | 'CLOSE'
  | 'REVIEW_CREATURES'
  | 'MANUAL_REVIEW'

/** Рекомендация по порталу. Только предлагает решение, ничего не выполняет. */
export interface PortalRecommendation {
  code: RecommendationCode
  /** Текст для интерфейса. */
  message: string
}
