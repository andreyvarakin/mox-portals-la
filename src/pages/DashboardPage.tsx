import { useReducer, useState } from 'react'
import {
  applyPortalCommand,
  createInitialPortalState,
  getPortalSummary,
  type PortalCommand,
} from '../application/index.ts'
import { AiWorklog } from '../components/AiWorklog.tsx'
import { AttentionList } from '../components/AttentionList.tsx'
import { GlobalEventLog } from '../components/GlobalEventLog.tsx'
import type { PendingConfirmation } from '../components/PortalActions.tsx'
import { PortalDetails } from '../components/PortalDetails.tsx'
import { PortalTable } from '../components/PortalTable.tsx'
import { ScenarioNav } from '../components/ScenarioNav.tsx'
import { SummaryCards } from '../components/SummaryCards.tsx'
import { getScenarioPortals, readDemoScenario } from '../components/demoScenario.ts'
import { aiWorklog } from '../content/aiWorklog.ts'
import { getActionAvailability, type PortalAction } from '../domain/index.ts'

/**
 * Граница интерфейса: только здесь появляются случайный id события и текущее время.
 * Application и domain layers остаются детерминированными.
 */
function createCommand(portalId: string, action: PortalAction, confirmed?: boolean): PortalCommand {
  return {
    portalId,
    action,
    confirmed,
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  }
}

export function DashboardPage() {
  // Сценарий выбирает только начальные данные: дальше состояние живёт обычным образом.
  const scenario = readDemoScenario(window.location.search)
  // Редьюсер — сама applyPortalCommand: логика целиком в application layer.
  // Начальный набор порталов — только seed, дальше всё берётся из state.
  const [state, dispatch] = useReducer(
    applyPortalCommand,
    getScenarioPortals(scenario),
    createInitialPortalState,
  )
  // Выбор и незавершённое подтверждение — состояние интерфейса, в PortalAppState не попадают.
  const [selectedPortalId, setSelectedPortalId] = useState<string | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null)

  const summary = getPortalSummary(state.portals)
  const selectedPortal =
    selectedPortalId === null
      ? undefined
      : state.portals.find((portal) => portal.id === selectedPortalId)
  const selectedEvents = selectedPortal
    ? state.events.filter((event) => event.portalId === selectedPortal.id)
    : []
  const activePortalId = selectedPortal?.id ?? null
  const visibleConfirmation =
    pendingConfirmation !== null && pendingConfirmation.portalId === activePortalId
      ? pendingConfirmation
      : null

  function handleSelectPortal(portalId: string) {
    if (portalId !== selectedPortalId) {
      setPendingConfirmation(null)
    }
    setSelectedPortalId(portalId)
  }

  function handleAction(action: PortalAction) {
    if (!selectedPortal) return

    const availability = getActionAvailability(selectedPortal, action)
    // Команда уходит в application layer в любом случае: запрос подтверждения
    // тоже записывается в журнал, портал при этом не меняется.
    dispatch(createCommand(selectedPortal.id, action))

    if (availability.kind === 'REQUIRES_CONFIRMATION' && action === 'CLOSE') {
      setPendingConfirmation({
        portalId: selectedPortal.id,
        action,
        warning: availability.warning,
      })
    }
  }

  function handleConfirm() {
    if (!visibleConfirmation) return

    dispatch(createCommand(visibleConfirmation.portalId, visibleConfirmation.action, true))
    setPendingConfirmation(null)
  }

  function handleCancelConfirmation() {
    setPendingConfirmation(null)
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Portal Control Center</h1>
        <p className="page-header__subtitle">Лаборатория нестабильных порталов</p>
        <p className="page-header__description">
          Контроль состояния межмировых порталов. Оцените риск и определите, какие объекты
          требуют внимания.
        </p>
        <ScenarioNav scenario={scenario} />
      </header>

      <main className="dashboard">
        <section aria-labelledby="summary-title">
          <h2 id="summary-title" className="visually-hidden">
            Сводка
          </h2>
          <SummaryCards summary={summary} />
        </section>

        <section aria-labelledby="attention-title">
          <h2 id="attention-title" className="section-title">
            Требуют внимания
          </h2>
          <div className="panel">
            <AttentionList
              items={summary.attention}
              portals={state.portals}
              selectedPortalId={activePortalId}
              onSelectPortal={handleSelectPortal}
            />
          </div>
        </section>

        <section aria-labelledby="portals-title">
          <h2 id="portals-title" className="section-title">
            Все порталы
          </h2>
          <div className="workspace">
            <div className="panel">
              <PortalTable
                portals={state.portals}
                selectedPortalId={activePortalId}
                onSelectPortal={handleSelectPortal}
              />
            </div>
            <PortalDetails
              portal={selectedPortal}
              events={selectedEvents}
              pendingConfirmation={visibleConfirmation}
              onAction={handleAction}
              onConfirm={handleConfirm}
              onCancelConfirmation={handleCancelConfirmation}
            />
          </div>
        </section>

        <GlobalEventLog events={state.events} portals={state.portals} />

        <AiWorklog worklog={aiWorklog} />
      </main>
    </div>
  )
}
