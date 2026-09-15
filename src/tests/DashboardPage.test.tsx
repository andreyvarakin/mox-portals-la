import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App.tsx'
import { AttentionList } from '../components/AttentionList.tsx'
import { PortalTable } from '../components/PortalTable.tsx'
import { demoPortals } from '../data/index.ts'

describe('Dashboard: только просмотр', () => {
  it('показывает название системы и лаборатории', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Portal Control Center' })).toBeInTheDocument()
    expect(screen.getByText('Лаборатория нестабильных порталов')).toBeInTheDocument()
  })

  it('сводка: открыто 7, критичных 2, закрыто 1', () => {
    render(<App />)
    const summary = screen.getByRole('region', { name: 'Сводка' })

    for (const [label, value] of [
      ['Открыто', '7'],
      ['Критичных', '2'],
      ['Закрыто', '1'],
    ]) {
      const card = within(summary).getByText(label).parentElement as HTMLElement

      expect(within(card).getByText(value)).toBeInTheDocument()
    }
  })

  it('таблица показывает все 8 порталов', () => {
    render(<App />)
    const table = screen.getByRole('table')

    expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(
      demoPortals.map((portal) => portal.name),
    )
  })

  it('строка «Врата Бездны» показывает параметры и риск', () => {
    render(<App />)
    const row = screen.getByRole('row', { name: /Врата Бездны/ })

    for (const text of ['Нокс', '91', '18', '8 мин', 'Критический', '88 / 100']) {
      expect(within(row).getByText(text)).toBeInTheDocument()
    }
  })

  it('список внимания идёт в порядке, который вернул getPortalSummary', () => {
    render(<App />)
    const attention = screen.getByRole('region', { name: 'Требуют внимания' })
    const items = within(attention).getAllByRole('listitem')

    const expected = [
      ['Врата Бездны', 'Критический', '88 / 100'],
      ['Пасть Пустоты', 'Критический', '85 / 100'],
      ['Пепельный разлом', 'Высокий риск', '66 / 100'],
      ['Зеркальный проход', 'Под вопросом', '13 / 100'],
      ['Хронорез', 'Средний риск', '49 / 100'],
      ['Разлом Люмии', 'Средний риск', '36 / 100'],
    ]
    expect(items).toHaveLength(expected.length)
    expected.forEach((texts, index) => {
      for (const text of texts) {
        expect(within(items[index]).getByText(text)).toBeInTheDocument()
      }
    })
  })

  it('кнопок действий пока нет', () => {
    render(<App />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    for (const label of ['Стабилизировать', 'Закрыть', 'Отправить наблюдателя']) {
      expect(screen.queryByText(label)).toBeNull()
    }
  })
})

describe('Компоненты на пустых данных', () => {
  it('PortalTable без порталов показывает сообщение вместо таблицы', () => {
    render(<PortalTable portals={[]} />)

    expect(screen.getByText('Порталов пока нет.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('AttentionList без элементов показывает сообщение вместо списка', () => {
    render(<AttentionList items={[]} portals={[]} />)

    expect(screen.getByText('Порталы, требующие внимания, отсутствуют.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).toBeNull()
  })
})
