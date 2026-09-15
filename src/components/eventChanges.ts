import type { PortalSnapshot } from '../domain/index.ts'
import { formatCollapseMinutes } from './formatters.ts'
import { RISK_LEVEL_LABELS, STATUS_LABELS } from './labels.ts'

export interface SnapshotChange {
  label: string
  before: string
  after: string
}

/**
 * Изменившиеся поля между снимками события — для показа в журнале.
 * Значения берутся только из снимков: история не пересчитывается по текущему порталу.
 */
export function describeSnapshotChanges(
  before: PortalSnapshot,
  after: PortalSnapshot,
): SnapshotChange[] {
  const changes: SnapshotChange[] = []

  if (before.status !== after.status) {
    changes.push({
      label: 'Статус',
      before: STATUS_LABELS[before.status],
      after: STATUS_LABELS[after.status],
    })
  }
  if (before.riskScore !== after.riskScore || before.riskLevel !== after.riskLevel) {
    changes.push({
      label: 'Риск',
      before: `${before.riskScore} ${RISK_LEVEL_LABELS[before.riskLevel]}`,
      after: `${after.riskScore} ${RISK_LEVEL_LABELS[after.riskLevel]}`,
    })
  }
  if (before.stability !== after.stability) {
    changes.push({ label: 'Стабильность', before: `${before.stability}`, after: `${after.stability}` })
  }
  if (before.energy !== after.energy) {
    changes.push({ label: 'Энергия', before: `${before.energy}`, after: `${after.energy}` })
  }
  if (before.collapseMinutes !== after.collapseMinutes) {
    changes.push({
      label: 'До схлопывания',
      before: formatCollapseMinutes(before.collapseMinutes),
      after: formatCollapseMinutes(after.collapseMinutes),
    })
  }
  if (before.creaturesInside !== after.creaturesInside) {
    changes.push({
      label: 'Существа внутри',
      before: `${before.creaturesInside}`,
      after: `${after.creaturesInside}`,
    })
  }

  return changes
}
