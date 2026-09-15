import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App.tsx'
import { demoPortals } from '../data/index.ts'
import {
  getActionAvailability,
  getPortalRecommendation,
  type Portal,
  type PortalAction,
} from '../domain/index.ts'

function demoPortal(id: string): Portal {
  const portal = demoPortals.find((candidate) => candidate.id === id)
  if (!portal) throw new Error(`Нет демо-портала ${id}`)
  return portal
}

function inspector(): HTMLElement {
  return screen.getByRole('complementary', { name: 'Карточка портала' })
}

function selectFromTable(name: string): void {
  fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name }))
}

function sectionByHeading(scope: HTMLElement, name: string): HTMLElement {
  const section = within(scope).getByRole('heading', { name }).closest('section')
  if (!section) throw new Error(`Нет секции «${name}»`)
  return section
}

/** Текст определения для термина из списка «термин — значение». */
function valueOf(scope: HTMLElement, term: string): string | null | undefined {
  return within(scope).getByText(term, { selector: 'dt' }).nextElementSibling?.textContent
}

function actions(): HTMLElement {
  return sectionByHeading(inspector(), 'Действия')
}

function actionButton(name: string): HTMLElement {
  return within(actions()).getByRole('button', { name })
}

function press(name: string): void {
  fireEvent.click(actionButton(name))
}

function summaryValue(label: string): string | null | undefined {
  return within(screen.getByRole('region', { name: 'Сводка' })).getByText(label).nextElementSibling
    ?.textContent
}

function riskText(): string | null {
  return sectionByHeading(inspector(), 'Риск').textContent
}

/** Записи истории выбранного портала: [подпись действия, подпись исхода]. */
function expectHistory(entries: [string, string][]): void {
  const items = within(sectionByHeading(inspector(), 'История изменений')).queryAllByRole('listitem')

  expect(items).toHaveLength(entries.length)
  entries.forEach(([action, outcome], index) => {
    expect(within(items[index]).getByText(action)).toBeInTheDocument()
    expect(within(items[index]).getByText(outcome)).toBeInTheDocument()
  })
}

function attentionButton(name: string): HTMLElement | null {
  return within(screen.getByRole('region', { name: 'Требуют внимания' })).queryByRole('button', {
    name: new RegExp(name),
  })
}

function blockedReason(portal: Portal, action: PortalAction): string {
  const availability = getActionAvailability(portal, action)
  if (availability.kind !== 'BLOCKED') throw new Error(`${action} для ${portal.id} не запрещено`)
  return availability.reason
}

describe('Действия над порталами', () => {
  it('стабилизация критического портала обновляет параметры, риск, сводку и историю', () => {
    render(<App />)
    selectFromTable('Врата Бездны')

    expect(valueOf(inspector(), 'Стабильность')).toBe('18 / 100')
    expect(valueOf(inspector(), 'Энергия')).toBe('91 / 100')
    expect(riskText()).toMatch(/Критический.*88 \/ 100/)
    expect(summaryValue('Критичных')).toBe('2')
    expect(actionButton('Отправить наблюдателя')).toBeDisabled()

    press('Стабилизировать')

    expect(within(inspector()).getByRole('heading', { name: 'Врата Бездны' })).toBeInTheDocument()
    expect(valueOf(inspector(), 'Стабильность')).toBe('43 / 100')
    expect(valueOf(inspector(), 'Энергия')).toBe('81 / 100')
    expect(riskText()).toMatch(/Высокий.*73 \/ 100/)
    expect(summaryValue('Критичных')).toBe('1')
    expect(actionButton('Отправить наблюдателя')).toBeEnabled()
    expectHistory([['Стабилизация', 'Выполнено']])
  })

  it('запрещённое действие недоступно, и причина запрета видна', () => {
    render(<App />)
    selectFromTable('Врата Бездны')

    expect(actionButton('Отправить наблюдателя')).toBeDisabled()
    expect(
      within(actions()).getByText(blockedReason(demoPortal('abyss-gate'), 'SEND_OBSERVER')),
    ).toBeInTheDocument()
  })

  it('отправка наблюдателя после стабилизации не меняет портал, но попадает в историю', () => {
    render(<App />)
    selectFromTable('Врата Бездны')
    press('Стабилизировать')

    press('Отправить наблюдателя')

    expect(valueOf(inspector(), 'Стабильность')).toBe('43 / 100')
    expect(valueOf(inspector(), 'Энергия')).toBe('81 / 100')
    expect(riskText()).toMatch(/Высокий.*73 \/ 100/)
    expectHistory([
      ['Стабилизация', 'Выполнено'],
      ['Отправка наблюдателя', 'Выполнено'],
    ])
  })

  it('закрытие портала с существами просит подтверждение, отмена не создаёт событий', () => {
    render(<App />)
    selectFromTable('Пасть Пустоты')
    const closeAvailability = getActionAvailability(demoPortal('void-maw'), 'CLOSE')
    if (closeAvailability.kind !== 'REQUIRES_CONFIRMATION') throw new Error('Ожидалось подтверждение')

    press('Закрыть портал')

    expect(valueOf(inspector(), 'Статус')).toBe('Открыт')
    expect(valueOf(inspector(), 'Существа внутри')).toBe('4')
    expect(within(actions()).getByText(closeAvailability.warning)).toBeInTheDocument()
    expect(within(actions()).queryByRole('button', { name: 'Закрыть портал' })).toBeNull()
    expectHistory([['Закрытие', 'Требует подтверждения']])

    press('Отмена')

    expect(within(actions()).queryByText(closeAvailability.warning)).toBeNull()
    expect(valueOf(inspector(), 'Статус')).toBe('Открыт')
    expect(actionButton('Закрыть портал')).toBeEnabled()
    expectHistory([['Закрытие', 'Требует подтверждения']])
  })

  it('подтверждённое закрытие закрывает портал отдельным событием', () => {
    render(<App />)
    selectFromTable('Пасть Пустоты')

    press('Закрыть портал')
    press('Закрыть всё равно')

    expect(valueOf(inspector(), 'Статус')).toBe('Закрыт')
    expect(valueOf(inspector(), 'До схлопывания')).toBe('—')
    expect(valueOf(inspector(), 'Существа внутри')).toBe('4')
    expect(riskText()).toMatch(/Низкий.*0 \/ 100/)
    expect(within(actions()).queryByRole('button', { name: 'Закрыть всё равно' })).toBeNull()
    expectHistory([
      ['Закрытие', 'Требует подтверждения'],
      ['Закрытие', 'Выполнено'],
    ])
  })

  it('выбор другого портала закрывает незавершённое подтверждение', () => {
    render(<App />)
    selectFromTable('Пасть Пустоты')
    press('Закрыть портал')

    selectFromTable('Хронорез')
    selectFromTable('Пасть Пустоты')

    expect(within(actions()).queryByRole('button', { name: 'Закрыть всё равно' })).toBeNull()
    expect(actionButton('Закрыть портал')).toBeEnabled()
    expect(valueOf(inspector(), 'Статус')).toBe('Открыт')
  })

  it('закрытие портала без существ выполняется сразу и пересчитывает сводку', () => {
    render(<App />)
    selectFromTable('Разлом Люмии')
    const lumia = demoPortal('lumia-rift')

    press('Закрыть портал')

    expect(within(inspector()).getByRole('heading', { name: 'Разлом Люмии' })).toBeInTheDocument()
    expect(valueOf(inspector(), 'Статус')).toBe('Закрыт')
    expect(valueOf(inspector(), 'До схлопывания')).toBe('—')
    expect(riskText()).toMatch(/Низкий.*0 \/ 100/)
    const closed = getPortalRecommendation({ ...lumia, status: 'CLOSED', collapseMinutes: null })
    expect(closed.code).toBe('NO_ACTION')
    expect(sectionByHeading(inspector(), 'Рекомендация')).toHaveTextContent(closed.message)
    expect(summaryValue('Открыто')).toBe('6')
    expect(summaryValue('Закрыто')).toBe('2')
    expect(attentionButton('Разлом Люмии')).toBeNull()
    expectHistory([['Закрытие', 'Выполнено']])
  })

  it('отметка «под вопросом» ставится и снимается одной контекстной кнопкой', () => {
    render(<App />)
    selectFromTable('Арка Авроры')
    expect(attentionButton('Арка Авроры')).toBeNull()

    press('Пометить как «под вопросом»')

    expect(valueOf(inspector(), 'Статус')).toBe('Под вопросом')
    expect(attentionButton('Арка Авроры')).not.toBeNull()
    const marked = getPortalRecommendation({ ...demoPortal('aurora-gate'), status: 'QUESTIONABLE' })
    expect(marked.code).toBe('MANUAL_REVIEW')
    expect(sectionByHeading(inspector(), 'Рекомендация')).toHaveTextContent(marked.message)
    expect(within(actions()).queryByRole('button', { name: 'Пометить как «под вопросом»' })).toBeNull()
    expectHistory([['Пометка «под вопросом»', 'Выполнено']])

    press('Снять отметку «под вопросом»')

    expect(valueOf(inspector(), 'Статус')).toBe('Открыт')
    expect(attentionButton('Арка Авроры')).toBeNull()
    expect(within(actions()).queryByRole('button', { name: 'Снять отметку «под вопросом»' })).toBeNull()
    expectHistory([
      ['Пометка «под вопросом»', 'Выполнено'],
      ['Снятие отметки', 'Выполнено'],
    ])
  })

  it('у закрытого портала все действия недоступны с причинами, изменить его нельзя', () => {
    render(<App />)
    selectFromTable('Узел Эреба')
    const erebus = demoPortal('erebus-node')
    const blocked: [string, PortalAction][] = [
      ['Стабилизировать', 'STABILIZE'],
      ['Отправить наблюдателя', 'SEND_OBSERVER'],
      ['Пометить как «под вопросом»', 'MARK_QUESTIONABLE'],
      ['Закрыть портал', 'CLOSE'],
    ]

    for (const [label, action] of blocked) {
      const button = actionButton(label)
      expect(button).toBeDisabled()
      expect(within(actions()).getByText(blockedReason(erebus, action))).toBeInTheDocument()
      fireEvent.click(button)
    }

    expect(valueOf(inspector(), 'Статус')).toBe('Закрыт')
    expectHistory([])
  })
})
