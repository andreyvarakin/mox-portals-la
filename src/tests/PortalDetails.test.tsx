import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App.tsx'
import { PortalHistory } from '../components/PortalHistory.tsx'
import { demoPortals } from '../data/index.ts'
import {
  calculateRisk,
  getPortalRecommendation,
  type Portal,
  type PortalEvent,
  type PortalSnapshot,
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

function attentionRegion(): HTMLElement {
  return screen.getByRole('region', { name: 'Требуют внимания' })
}

/** Текст определения для термина из списка «термин — значение». */
function valueOf(scope: HTMLElement, term: string): string | null | undefined {
  return within(scope).getByText(term, { selector: 'dt' }).nextElementSibling?.textContent
}

function sectionByHeading(scope: HTMLElement, name: string): HTMLElement {
  const section = within(scope).getByRole('heading', { name }).closest('section')
  if (!section) throw new Error(`Нет секции «${name}»`)
  return section
}

describe('Выбор портала и карточка', () => {
  it('при первом рендере карточка пустая и ни один портал не выбран', () => {
    render(<App />)
    const details = inspector()

    expect(within(details).getByRole('heading', { name: 'Выберите портал' })).toBeInTheDocument()
    expect(within(details).queryByText('Нокс')).toBeNull()
    expect(within(details).queryByRole('heading', { name: 'Рекомендация' })).toBeNull()
    expect(document.querySelectorAll('[aria-current="true"]')).toHaveLength(0)
  })

  it('выбор «Врата Бездны» в таблице показывает параметры и риск', () => {
    render(<App />)

    selectFromTable('Врата Бездны')

    const details = inspector()
    expect(within(details).getByRole('heading', { name: 'Врата Бездны' })).toBeInTheDocument()
    expect(valueOf(details, 'Мир')).toBe('Нокс')
    expect(valueOf(details, 'Энергия')).toBe('91 / 100')
    expect(valueOf(details, 'Стабильность')).toBe('18 / 100')
    expect(valueOf(details, 'До схлопывания')).toBe('8 мин')
    expect(valueOf(details, 'Существа внутри')).toBe('0')
    const risk = sectionByHeading(details, 'Риск')
    expect(within(risk).getByText('Критический')).toBeInTheDocument()
    expect(within(risk).getByText('88 / 100')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByRole('button', { name: 'Врата Бездны' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('«Врата Бездны»: причины из calculateRisk, три фактора и рекомендация закрыть', () => {
    render(<App />)
    selectFromTable('Врата Бездны')
    const details = inspector()
    const abyss = demoPortal('abyss-gate')

    const reasons = within(sectionByHeading(details, 'Почему такой риск')).getAllByRole('listitem')
    expect(reasons.map((item) => item.textContent)).toEqual(calculateRisk(abyss).reasons)

    const factors = sectionByHeading(details, 'Факторы риска')
    expect(valueOf(factors, 'Риск по стабильности')).toBe('82 / 100')
    expect(valueOf(factors, 'Риск по энергии')).toBe('91 / 100')
    expect(valueOf(factors, 'Риск по времени')).toBe('93.33 / 100')

    const recommendation = getPortalRecommendation(abyss)
    expect(recommendation.code).toBe('CLOSE')
    const block = sectionByHeading(details, 'Рекомендация')
    expect(block).toHaveTextContent(recommendation.message)
    expect(block).toHaveTextContent(/закры/i)
  })

  it('«Пасть Пустоты»: рекомендация учитывает существ перед закрытием', () => {
    render(<App />)
    selectFromTable('Пасть Пустоты')

    const recommendation = getPortalRecommendation(demoPortal('void-maw'))
    expect(recommendation.code).toBe('REVIEW_CREATURES')
    const block = sectionByHeading(inspector(), 'Рекомендация')
    expect(block).toHaveTextContent(recommendation.message)
    expect(block).toHaveTextContent(/существ/i)
  })

  it('«Зеркальный проход»: при низком риске рекомендована ручная проверка', () => {
    render(<App />)
    selectFromTable('Зеркальный проход')
    const details = inspector()

    expect(valueOf(details, 'Статус')).toBe('Под вопросом')
    expect(within(sectionByHeading(details, 'Риск')).getByText('Низкий')).toBeInTheDocument()
    const recommendation = getPortalRecommendation(demoPortal('mirror-passage'))
    expect(recommendation.code).toBe('MANUAL_REVIEW')
    expect(sectionByHeading(details, 'Рекомендация')).toHaveTextContent(recommendation.message)
  })

  it('портал открывается из списка внимания, а выбор переключается на другой портал', () => {
    render(<App />)
    const voidMawButton = within(attentionRegion()).getByRole('button', { name: /Пасть Пустоты/ })

    fireEvent.click(voidMawButton)
    expect(within(inspector()).getByRole('heading', { name: 'Пасть Пустоты' })).toBeInTheDocument()
    expect(voidMawButton).toHaveAttribute('aria-current', 'true')

    selectFromTable('Узел Эреба')
    expect(within(inspector()).getByRole('heading', { name: 'Узел Эреба' })).toBeInTheDocument()
    expect(valueOf(inspector(), 'Статус')).toBe('Закрыт')
    expect(valueOf(inspector(), 'До схлопывания')).toBe('—')
    expect(voidMawButton).not.toHaveAttribute('aria-current')
  })

  it('история выбранного портала пока пуста', () => {
    render(<App />)
    selectFromTable('Хронорез')

    expect(
      within(sectionByHeading(inspector(), 'История изменений')).getByText('История изменений пока пуста.'),
    ).toBeInTheDocument()
  })

})

describe('Объяснение расчёта риска', () => {
  it('справка есть у выбранного портала и по умолчанию свёрнута', () => {
    render(<App />)
    selectFromTable('Врата Бездны')
    const help = within(inspector()).getByText('Как считается риск').closest('details')

    expect(help).toBeInTheDocument()
    expect(help).not.toHaveAttribute('open')
    expect(help?.tagName).toBe('DETAILS')
  })

  it('объясняет веса, горизонт времени, границы уровней и роль существ', () => {
    render(<App />)
    selectFromTable('Врата Бездны')
    const help = within(inspector()).getByText('Как считается риск').closest('details') as HTMLElement

    expect(within(help).getByText('45%').nextElementSibling).toHaveTextContent('стабильност')
    expect(within(help).getByText('30%').nextElementSibling).toHaveTextContent('энерги')
    expect(within(help).getByText('25%').nextElementSibling).toHaveTextContent('схлопывания')
    expect(help).toHaveTextContent(/120 минут/)
    expect(help).toHaveTextContent(/0–29/)
    expect(help).toHaveTextContent(/80–100/)
    expect(help).toHaveTextContent(/[Сс]ущества внутри не входят в технический балл риска/)
  })
})

describe('PortalHistory', () => {
  const snapshot: PortalSnapshot = {
    status: 'OPEN',
    energy: 91,
    stability: 18,
    collapseMinutes: 8,
    creaturesInside: 0,
    riskScore: 88,
    riskLevel: 'CRITICAL',
  }
  const events: PortalEvent[] = [
    {
      id: 'evt-1',
      portalId: 'abyss-gate',
      timestamp: '2026-09-15T12:00:00.000Z',
      action: 'STABILIZE',
      outcome: 'APPLIED',
      message: 'Портал стабилизирован',
      before: snapshot,
      after: { ...snapshot, stability: 43, energy: 81, riskScore: 73, riskLevel: 'HIGH' },
    },
    {
      id: 'evt-2',
      portalId: 'abyss-gate',
      timestamp: 'не дата',
      action: 'SEND_OBSERVER',
      outcome: 'BLOCKED',
      message: 'Отправка запрещена',
      before: snapshot,
      after: snapshot,
    },
  ]

  it('показывает время, действие, исход и сообщение; некорректное время — как есть', () => {
    render(<PortalHistory events={events} />)
    const [applied, blocked] = screen.getAllByRole('listitem')

    const time = within(applied).getByText(/15\.09\.2026/)
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('datetime', '2026-09-15T12:00:00.000Z')
    for (const text of ['Стабилизация', 'Выполнено', 'Портал стабилизирован']) {
      expect(within(applied).getByText(text)).toBeInTheDocument()
    }

    for (const text of ['не дата', 'Отправка наблюдателя', 'Заблокировано', 'Отправка запрещена']) {
      expect(within(blocked).getByText(text)).toBeInTheDocument()
    }
  })
})
