import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../App.tsx'
import { demoPortals } from '../data/index.ts'

/** Сценарий читается из адреса, поэтому каждый тест начинает с чистого URL. */
function setUrl(url: string): void {
  window.history.replaceState({}, '', url)
}

function scenarioLink(name: string): HTMLElement {
  return within(screen.getByRole('navigation', { name: 'Демо-сценарий' })).getByRole('link', {
    name,
  })
}

function summaryValue(label: string): string | null {
  const summary = screen.getByRole('region', { name: 'Сводка' })
  const card = within(summary).getByText(label).parentElement as HTMLElement

  return within(card).getByText(/^\d+$/).textContent
}

beforeEach(() => {
  setUrl('/')
})

afterEach(() => {
  setUrl('/')
})

describe('Демо-сценарий: рабочий набор', () => {
  it('без параметра scenario показывает демо-набор и помечает «Рабочий набор» текущим', () => {
    render(<App />)

    expect(scenarioLink('Рабочий набор')).toHaveAttribute('aria-current', 'page')
    expect(scenarioLink('Пустая лаборатория')).not.toHaveAttribute('aria-current')

    expect(summaryValue('Открыто')).toBe('7')
    expect(summaryValue('Критичных')).toBe('2')
    expect(summaryValue('Закрыто')).toBe('1')

    const table = screen.getByRole('table')

    expect(within(table).getAllByRole('rowheader')).toHaveLength(demoPortals.length)
  })

  it('ссылки сценариев сохраняют путь и меняют только query', () => {
    render(<App />)

    expect(scenarioLink('Рабочий набор')).toHaveAttribute('href', '/')
    expect(scenarioLink('Пустая лаборатория')).toHaveAttribute('href', '/?scenario=empty')
  })

  it('ссылки сохраняют вложенный путь развёртывания', () => {
    setUrl('/mox-portals-la/?scenario=empty')
    render(<App />)

    expect(scenarioLink('Рабочий набор')).toHaveAttribute('href', '/mox-portals-la/')
    expect(scenarioLink('Пустая лаборатория')).toHaveAttribute(
      'href',
      '/mox-portals-la/?scenario=empty',
    )
    expect(scenarioLink('Пустая лаборатория')).toHaveAttribute('aria-current', 'page')
  })
})

describe('Демо-сценарий: пустая лаборатория', () => {
  beforeEach(() => {
    setUrl('/?scenario=empty')
  })

  it('стартует с пустым списком порталов и показывает нули в сводке', () => {
    render(<App />)

    expect(scenarioLink('Пустая лаборатория')).toHaveAttribute('aria-current', 'page')
    expect(scenarioLink('Рабочий набор')).not.toHaveAttribute('aria-current')

    expect(summaryValue('Открыто')).toBe('0')
    expect(summaryValue('Критичных')).toBe('0')
    expect(summaryValue('Закрыто')).toBe('0')

    expect(screen.getByText('Порталы, требующие внимания, отсутствуют.')).toBeInTheDocument()
    expect(screen.getByText('Порталов пока нет.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Выберите портал' })).toBeInTheDocument()
    expect(screen.getByText('0 событий')).toBeInTheDocument()
    expect(screen.getByText('Событий пока нет.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('действий нет, потому что выбирать нечего', () => {
    render(<App />)

    for (const label of [
      'Стабилизировать',
      'Отправить наблюдателя',
      'Закрыть портал',
      'Пометить как «под вопросом»',
    ]) {
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument()
    }
  })

  it('AI Worklog остаётся на странице', () => {
    render(<App />)

    expect(screen.getByRole('region', { name: 'AI Worklog' })).toBeInTheDocument()
  })
})
