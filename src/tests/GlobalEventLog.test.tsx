import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App.tsx'
import { formatEventCount } from '../components/formatters.ts'
import { GlobalEventLog } from '../components/GlobalEventLog.tsx'
import type { PortalEvent, PortalSnapshot } from '../domain/index.ts'

function eventLog(): HTMLElement {
  return screen.getByRole('region', { name: 'Журнал событий' })
}

function logItems(): HTMLElement[] {
  return within(eventLog()).queryAllByRole('listitem')
}

function inspector(): HTMLElement {
  return screen.getByRole('complementary', { name: 'Карточка портала' })
}

function selectFromTable(name: string): void {
  fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name }))
}

function press(name: string): void {
  const actions = within(inspector()).getByRole('heading', { name: 'Действия' }).closest('section')
  if (!actions) throw new Error('Нет секции действий')
  fireEvent.click(within(actions).getByRole('button', { name }))
}

/** Строка изменения «было → стало» внутри записи журнала, или undefined, если строки нет. */
function changeOf(item: HTMLElement, label: string): string | null | undefined {
  return within(item).queryByText(label, { selector: 'dt' })?.nextElementSibling?.textContent
}

describe('Журнал событий', () => {
  it('до первого действия показывает пустое состояние и 0 событий', () => {
    render(<App />)

    expect(within(eventLog()).getByText('0 событий')).toBeInTheDocument()
    expect(within(eventLog()).getByText('Событий пока нет.')).toBeInTheDocument()
    expect(within(eventLog()).queryByRole('list')).toBeNull()
  })

  it('стабилизация попадает в журнал с изменениями из снимков', () => {
    render(<App />)
    selectFromTable('Врата Бездны')

    press('Стабилизировать')

    expect(within(eventLog()).getByText('1 событие')).toBeInTheDocument()
    const [item] = logItems()
    for (const text of ['Врата Бездны', 'Стабилизация', 'Выполнено']) {
      expect(within(item).getByText(text)).toBeInTheDocument()
    }
    expect(changeOf(item, 'Риск')).toBe('88 Критический → 73 Высокий')
    expect(changeOf(item, 'Стабильность')).toBe('18 → 43')
    expect(changeOf(item, 'Энергия')).toBe('91 → 81')
    expect(changeOf(item, 'Статус')).toBeUndefined()
    expect(changeOf(item, 'До схлопывания')).toBeUndefined()
  })

  it('события разных порталов идут в порядке действий, независимо от выбранного портала', () => {
    render(<App />)
    selectFromTable('Врата Бездны')
    press('Стабилизировать')
    press('Отправить наблюдателя')
    selectFromTable('Пасть Пустоты')
    press('Закрыть портал')
    press('Закрыть всё равно')
    selectFromTable('Арка Авроры')
    press('Пометить как «под вопросом»')

    expect(within(eventLog()).getByText('5 событий')).toBeInTheDocument()
    const items = logItems()
    const expected: [string, string, string][] = [
      ['Врата Бездны', 'Стабилизация', 'Выполнено'],
      ['Врата Бездны', 'Отправка наблюдателя', 'Выполнено'],
      ['Пасть Пустоты', 'Закрытие', 'Требует подтверждения'],
      ['Пасть Пустоты', 'Закрытие', 'Выполнено'],
      ['Арка Авроры', 'Пометка «под вопросом»', 'Выполнено'],
    ]
    expect(items).toHaveLength(expected.length)
    expected.forEach((texts, index) => {
      for (const text of texts) {
        expect(within(items[index]).getByText(text)).toBeInTheDocument()
      }
    })

    // «Не изменились» — только у выполненного действия без изменений; у запроса подтверждения строки нет.
    expect(within(items[1]).getByText('Параметры портала не изменились.')).toBeInTheDocument()
    expect(within(items[2]).queryByText('Параметры портала не изменились.')).toBeNull()

    // Подтверждённое закрытие: статус, риск и время; существа не изменились — строки нет.
    expect(changeOf(items[3], 'Статус')).toBe('Открыт → Закрыт')
    expect(changeOf(items[3], 'Риск')).toBe('85 Критический → 0 Низкий')
    expect(changeOf(items[3], 'До схлопывания')).toBe('12 мин → —')
    expect(changeOf(items[3], 'Существа внутри')).toBeUndefined()

    expect(changeOf(items[4], 'Статус')).toBe('Открыт → Под вопросом')
  })

  it('прошлые записи показывают состояние на момент события, а не текущее', () => {
    render(<App />)
    selectFromTable('Врата Бездны')

    press('Стабилизировать')
    press('Стабилизировать')

    const [first, second] = logItems()
    expect(changeOf(first, 'Риск')).toBe('88 Критический → 73 Высокий')
    expect(changeOf(first, 'Стабильность')).toBe('18 → 43')
    expect(changeOf(second, 'Риск')).toBe('73 Высокий → 59 Средний')
    expect(changeOf(second, 'Стабильность')).toBe('43 → 68')
  })
})

describe('GlobalEventLog на искусственных событиях', () => {
  const snapshot: PortalSnapshot = {
    status: 'OPEN',
    energy: 50,
    stability: 50,
    collapseMinutes: 8,
    creaturesInside: 4,
    riskScore: 50,
    riskLevel: 'MEDIUM',
  }

  it('неизвестный портал показывается по id, некорректное время — как есть, существа и время — строками', () => {
    const event: PortalEvent = {
      id: 'evt-1',
      portalId: 'removed-portal',
      timestamp: 'не дата',
      action: 'CLOSE',
      outcome: 'APPLIED',
      message: 'Портал закрыт',
      before: snapshot,
      after: { ...snapshot, collapseMinutes: null, creaturesInside: 3 },
    }

    render(<GlobalEventLog events={[event]} portals={[]} />)
    const [item] = within(eventLog()).getAllByRole('listitem')

    expect(within(item).getByText('removed-portal')).toBeInTheDocument()
    expect(within(item).getByText('не дата')).toBeInTheDocument()
    expect(changeOf(item, 'До схлопывания')).toBe('8 мин → —')
    expect(changeOf(item, 'Существа внутри')).toBe('4 → 3')
    expect(changeOf(item, 'Риск')).toBeUndefined()
  })

  it('у заблокированного действия без изменений строки «не изменились» нет', () => {
    const event: PortalEvent = {
      id: 'evt-2',
      portalId: 'abyss-gate',
      timestamp: '2026-09-15T12:00:00.000Z',
      action: 'SEND_OBSERVER',
      outcome: 'BLOCKED',
      message: 'Риск портала критический — отправлять наблюдателя нельзя',
      before: snapshot,
      after: snapshot,
    }

    render(<GlobalEventLog events={[event]} portals={[]} />)
    const [item] = within(eventLog()).getAllByRole('listitem')

    expect(within(item).getByText('Заблокировано')).toBeInTheDocument()
    expect(within(item).getByText(event.message)).toBeInTheDocument()
    expect(within(item).queryByText('Параметры портала не изменились.')).toBeNull()
  })
})

describe('formatEventCount', () => {
  it.each([
    [0, '0 событий'],
    [1, '1 событие'],
    [2, '2 события'],
    [4, '4 события'],
    [5, '5 событий'],
    [11, '11 событий'],
    [12, '12 событий'],
    [21, '21 событие'],
    [22, '22 события'],
    [25, '25 событий'],
    [101, '101 событие'],
    [111, '111 событий'],
  ])('%d → %s', (count, expected) => {
    expect(formatEventCount(count)).toBe(expected)
  })
})
