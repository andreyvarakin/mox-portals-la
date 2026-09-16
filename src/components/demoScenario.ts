import { demoPortals } from '../data/index.ts'
import type { Portal } from '../domain/index.ts'

/**
 * Демо-сценарий стартовых данных лаборатории.
 *
 * Это забота интерфейса: domain и application о сценариях не знают и получают
 * обычный список порталов. Сценарий задаётся query-параметром, потому что
 * переключение должно перезагружать страницу и собирать состояние заново.
 */
export type DemoScenario = 'default' | 'empty'

const SCENARIO_PARAM = 'scenario'
const EMPTY_SCENARIO_VALUE = 'empty'
const EMPTY_PORTALS: readonly Portal[] = []

/** Неизвестное значение параметра считается обычным сценарием. */
export function readDemoScenario(search: string): DemoScenario {
  return new URLSearchParams(search).get(SCENARIO_PARAM) === EMPTY_SCENARIO_VALUE
    ? 'empty'
    : 'default'
}

/** Начальные данные сценария — то, из чего создаётся PortalAppState. */
export function getScenarioPortals(scenario: DemoScenario): readonly Portal[] {
  return scenario === 'empty' ? EMPTY_PORTALS : demoPortals
}

/** Адрес сценария: текущий путь сохраняется, меняется только query. */
export function getScenarioHref(scenario: DemoScenario, pathname: string): string {
  return scenario === 'empty' ? `${pathname}?${SCENARIO_PARAM}=${EMPTY_SCENARIO_VALUE}` : pathname
}
