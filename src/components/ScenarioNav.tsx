import { getScenarioHref, type DemoScenario } from './demoScenario.ts'

const SCENARIOS: readonly { id: DemoScenario; title: string }[] = [
  { id: 'default', title: 'Рабочий набор' },
  { id: 'empty', title: 'Пустая лаборатория' },
]

interface ScenarioNavProps {
  scenario: DemoScenario
}

/**
 * Переключатель демо-сценария: обычные ссылки, а не состояние React.
 * Переход перезагружает страницу, поэтому состояние собирается заново из
 * выбранного набора порталов — накопленные события при этом сбрасываются.
 */
export function ScenarioNav({ scenario }: ScenarioNavProps) {
  const pathname = window.location.pathname

  return (
    <nav className="scenario" aria-label="Демо-сценарий">
      <span className="scenario__label">Демо-сценарий</span>
      <ul className="scenario__options">
        {SCENARIOS.map((option) => {
          const isCurrent = option.id === scenario

          return (
            <li key={option.id}>
              <a
                className={isCurrent ? 'scenario__link scenario__link--current' : 'scenario__link'}
                href={getScenarioHref(option.id, pathname)}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {/* Метка, а не только цвет: текущий вариант виден и в ч/б. */}
                <span className="scenario__mark" aria-hidden="true">
                  {isCurrent ? '✓' : ''}
                </span>
                {option.title}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
