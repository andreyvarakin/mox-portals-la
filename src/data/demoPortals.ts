import type { Portal } from '../domain/index.ts'

/**
 * Демонстрационный набор порталов — исходные данные приложения.
 *
 * Только параметры порталов: риск и рекомендации не хранятся, их считают
 * calculateRisk и getPortalRecommendation. Массив только для чтения — рабочую
 * копию создаст слой состояния.
 *
 * Покрытие сценариев (score / уровень / рекомендация):
 *   aurora-gate     10 LOW       KEEP_OPEN
 *   mirror-passage  13 LOW       MANUAL_REVIEW     — ручная отметка при низком риске
 *   lumia-rift      36 MEDIUM    STABILIZE
 *   ash-rift        66 HIGH      STABILIZE
 *   abyss-gate      88 CRITICAL  CLOSE
 *   void-maw        85 CRITICAL  REVIEW_CREATURES  — внутри существа
 *   chronos-tear    49 MEDIUM    STABILIZE         — MEDIUM из-за схлопывания через 5 минут
 *   erebus-node      0 LOW       NO_ACTION         — закрыт, несмотря на опасные параметры
 */
export const demoPortals: readonly Portal[] = [
  {
    id: 'aurora-gate',
    name: 'Арка Авроры',
    destinationWorld: 'Элирия',
    energy: 20,
    stability: 92,
    collapseMinutes: 180,
    creaturesInside: 0,
    status: 'OPEN',
  },
  {
    id: 'mirror-passage',
    name: 'Зеркальный проход',
    destinationWorld: 'Спекулум',
    energy: 25,
    stability: 88,
    collapseMinutes: 150,
    creaturesInside: 1,
    status: 'QUESTIONABLE',
  },
  {
    id: 'lumia-rift',
    name: 'Разлом Люмии',
    destinationWorld: 'Люмия',
    energy: 45,
    stability: 65,
    collapseMinutes: 90,
    creaturesInside: 0,
    status: 'OPEN',
  },
  {
    id: 'ash-rift',
    name: 'Пепельный разлом',
    destinationWorld: 'Кальдера',
    energy: 75,
    stability: 40,
    collapseMinutes: 40,
    creaturesInside: 0,
    status: 'OPEN',
  },
  {
    id: 'abyss-gate',
    name: 'Врата Бездны',
    destinationWorld: 'Нокс',
    energy: 91,
    stability: 18,
    collapseMinutes: 8,
    creaturesInside: 0,
    status: 'OPEN',
  },
  {
    id: 'void-maw',
    name: 'Пасть Пустоты',
    destinationWorld: 'Обливион',
    energy: 88,
    stability: 20,
    collapseMinutes: 12,
    creaturesInside: 4,
    status: 'OPEN',
  },
  {
    id: 'chronos-tear',
    name: 'Хронорез',
    destinationWorld: 'Хронос',
    energy: 40,
    stability: 70,
    collapseMinutes: 5,
    creaturesInside: 0,
    status: 'OPEN',
  },
  {
    id: 'erebus-node',
    name: 'Узел Эреба',
    destinationWorld: 'Эреб',
    energy: 95,
    stability: 15,
    collapseMinutes: null,
    creaturesInside: 0,
    status: 'CLOSED',
  },
]
