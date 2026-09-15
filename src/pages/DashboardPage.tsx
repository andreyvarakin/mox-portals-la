import { useState } from 'react'
import { createInitialPortalState, getPortalSummary } from '../application/index.ts'
import { AttentionList } from '../components/AttentionList.tsx'
import { PortalDetails } from '../components/PortalDetails.tsx'
import { PortalTable } from '../components/PortalTable.tsx'
import { SummaryCards } from '../components/SummaryCards.tsx'
import { demoPortals } from '../data/index.ts'

// Действий пока нет: состояние порталов создаётся один раз и не меняется.
const initialState = createInitialPortalState(demoPortals)

export function DashboardPage() {
  const state = initialState
  // Выбор портала — состояние интерфейса, в PortalAppState не попадает.
  const [selectedPortalId, setSelectedPortalId] = useState<string | null>(null)

  const summary = getPortalSummary(state.portals)
  const selectedPortal =
    selectedPortalId === null
      ? undefined
      : state.portals.find((portal) => portal.id === selectedPortalId)
  const selectedEvents = selectedPortal
    ? state.events.filter((event) => event.portalId === selectedPortal.id)
    : []
  const activePortalId = selectedPortal?.id ?? null

  return (
    <div className="page">
      <header className="page-header">
        <h1>Portal Control Center</h1>
        <p className="page-header__subtitle">Лаборатория нестабильных порталов</p>
        <p className="page-header__description">
          Контроль состояния межмировых порталов. Оцените риск и определите, какие объекты
          требуют внимания.
        </p>
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
              onSelectPortal={setSelectedPortalId}
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
                onSelectPortal={setSelectedPortalId}
              />
            </div>
            <PortalDetails portal={selectedPortal} events={selectedEvents} />
          </div>
        </section>
      </main>
    </div>
  )
}
