import {
  calculateRisk,
  type Portal,
  type PortalStatus,
  type RiskLevel,
} from '../domain/index.ts'

/** Почему портал требует внимания. */
export type AttentionKind = 'CRITICAL' | 'HIGH' | 'QUESTIONABLE' | 'MEDIUM'

/** Портал в списке внимания. Имя и мир интерфейс берёт из Portal по portalId. */
export interface PortalAttentionItem {
  portalId: string
  riskScore: number
  riskLevel: RiskLevel
  kind: AttentionKind
}

/** Сводка по порталам. Вычисляется из списка порталов и в состоянии не хранится. */
export interface PortalSummary {
  /** Физически открытые: OPEN и QUESTIONABLE. */
  openCount: number
  /** Незакрытые порталы с риском CRITICAL. */
  criticalCount: number
  closedCount: number
  /** Активные порталы, требующие внимания, — сначала самые срочные. */
  attention: readonly PortalAttentionItem[]
}

const ATTENTION_PRIORITY: Record<AttentionKind, number> = {
  CRITICAL: 4,
  HIGH: 3,
  QUESTIONABLE: 2,
  MEDIUM: 1,
}

/**
 * Считает сводку по порталам и список тех, что требуют внимания.
 *
 * Риск берётся только из calculateRisk. Закрытые порталы не считаются
 * критичными и в список внимания не попадают.
 *
 * Порядок внимания: по приоритету вида (CRITICAL > HIGH > QUESTIONABLE > MEDIUM),
 * внутри вида — по убыванию riskScore, при равенстве — как в исходном массиве.
 *
 * Чистая функция: массив и порталы не изменяются. Если данные активного портала
 * некорректны, ошибка calculateRisk пробрасывается как есть.
 */
export function getPortalSummary(portals: readonly Portal[]): PortalSummary {
  let openCount = 0
  let criticalCount = 0
  let closedCount = 0
  const attention: PortalAttentionItem[] = []

  for (const portal of portals) {
    if (portal.status === 'CLOSED') {
      closedCount += 1
      continue
    }

    openCount += 1
    const { score, level } = calculateRisk(portal)
    if (level === 'CRITICAL') {
      criticalCount += 1
    }

    const kind = attentionKind(level, portal.status)
    if (kind !== null) {
      attention.push({ portalId: portal.id, riskScore: score, riskLevel: level, kind })
    }
  }

  // Сортируется собственный массив attention; sort стабилен, поэтому при
  // полном равенстве сохраняется исходный порядок порталов.
  attention.sort(compareAttention)

  return { openCount, criticalCount, closedCount, attention }
}

function attentionKind(level: RiskLevel, status: PortalStatus): AttentionKind | null {
  if (level === 'CRITICAL') return 'CRITICAL'
  if (level === 'HIGH') return 'HIGH'
  if (status === 'QUESTIONABLE') return 'QUESTIONABLE'
  if (level === 'MEDIUM') return 'MEDIUM'
  return null
}

function compareAttention(a: PortalAttentionItem, b: PortalAttentionItem): number {
  return ATTENTION_PRIORITY[b.kind] - ATTENTION_PRIORITY[a.kind] || b.riskScore - a.riskScore
}
