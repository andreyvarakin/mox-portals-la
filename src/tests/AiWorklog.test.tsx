import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App.tsx'
import { aiWorklog } from '../content/aiWorklog.ts'

function worklogSection(): HTMLElement {
  return screen.getByRole('region', { name: 'AI Worklog' })
}

function blockByHeading(name: string): HTMLElement {
  const block = within(worklogSection()).getByRole('heading', { level: 3, name }).parentElement
  if (!block) throw new Error(`Нет блока «${name}»`)
  return block
}

/** Все строки контента, рекурсивно. */
function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(allStrings)
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(allStrings)
  return []
}

const REQUIRED_STAGES = [
  'Идея и разбор ТЗ',
  'Архитектура',
  'Логика риска',
  'Действия и ограничения',
  'Интерфейс',
  'Отладка и проверка',
  'Финальная проверка',
]

describe('AI Worklog на странице', () => {
  it('секция с id ai-worklog и подзаголовком стоит после журнала событий', () => {
    const { container } = render(<App />)
    const section = worklogSection()

    expect(section).toHaveAttribute('id', 'ai-worklog')
    expect(within(section).getByRole('heading', { level: 2, name: 'AI Worklog' })).toBeInTheDocument()
    expect(
      within(section).getByText('Как использовался AI при разработке этого приложения'),
    ).toBeInTheDocument()

    const eventLog = screen.getByRole('region', { name: 'Журнал событий' })
    expect(eventLog.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelector('#ai-worklog')).toBe(section)
  })

  it('показывает инструмент, время разработки и токены', () => {
    render(<App />)
    const facts = worklogSection()

    for (const fact of aiWorklog.facts) {
      const term = within(facts).getByText(fact.label, { selector: 'dt' })
      expect(term.nextElementSibling).toHaveTextContent(fact.value)
    }
    expect(within(facts).getByText('Claude Code', { selector: 'dd' })).toBeInTheDocument()
    expect(
      within(facts).getByText('Общее время разработки', { selector: 'dt' }).nextElementSibling,
    ).toHaveTextContent(/12 часов/)
    expect(within(facts).getByText('Период работы', { selector: 'dt' }).nextElementSibling).toHaveTextContent(
      /18 сентября/,
    )
  })

  it('все этапы из задания видны по порядку, у каждого есть роли человека и AI', () => {
    render(<App />)
    const titles = within(blockByHeading('Этапы работы')).getAllByRole('heading', { level: 4 })

    expect(titles).toHaveLength(REQUIRED_STAGES.length)
    titles.forEach((title, index) => {
      expect(title).toHaveTextContent(REQUIRED_STAGES[index])
      const stage = title.closest('li') as HTMLElement
      expect(within(stage).getByText('Человек')).toBeInTheDocument()
      expect(within(stage).getByText('AI')).toBeInTheDocument()
    })
  })

  it('показывает ключевые запросы, мои решения, ошибки AI, ручную работу, проверки и улучшения', () => {
    render(<App />)

    const prompts = blockByHeading('Ключевые запросы')
    expect(within(prompts).getByText('Сокращённые примеры ключевых запросов')).toBeInTheDocument()
    expect(within(prompts).getAllByRole('listitem')).toHaveLength(aiWorklog.prompts.length)

    expect(within(blockByHeading('Мои решения')).getAllByRole('listitem')).toHaveLength(
      aiWorklog.decisions.length,
    )
    expect(
      within(blockByHeading('Где сгенерированный результат потребовал проверки и правки')).getAllByRole('listitem'),
    ).toHaveLength(aiWorklog.issues.length)
    expect(within(blockByHeading('Что сделано вручную')).getAllByRole('listitem')).toHaveLength(
      aiWorklog.manualWork.length,
    )
    expect(within(blockByHeading('Как проверялось')).getAllByRole('listitem')).toHaveLength(
      aiWorklog.verification.length,
    )
    expect(
      within(blockByHeading('Что улучшить в реальном продукте')).getAllByRole('listitem'),
    ).toHaveLength(aiWorklog.improvements.length)
  })
})

describe('Содержимое AI Worklog', () => {
  it('соответствует требованиям задания по составу', () => {
    expect(aiWorklog.stages.map((stage) => stage.title)).toEqual(REQUIRED_STAGES)
    expect(aiWorklog.prompts.length).toBeGreaterThanOrEqual(5)
    expect(aiWorklog.prompts.length).toBeLessThanOrEqual(7)
    expect(aiWorklog.decisions.length).toBeGreaterThanOrEqual(3)
    expect(aiWorklog.decisions.length).toBeLessThanOrEqual(5)
    for (const stage of aiWorklog.stages) {
      expect(stage.human.length, stage.title).toBeGreaterThan(0)
      expect(stage.ai.length, stage.title).toBeGreaterThan(0)
    }
    expect(aiWorklog.issues.length).toBeGreaterThan(0)
    expect(aiWorklog.improvements.length).toBeGreaterThan(0)
  })

  it('в фактах не осталось незаполненных значений', () => {
    for (const fact of aiWorklog.facts) {
      expect(fact.value.trim(), fact.label).not.toBe('')
      expect(fact.value, fact.label).not.toMatch(/Уточнить|TODO|TBD/i)
    }
  })

  it('не содержит пустых строк, а ключи списков уникальны', () => {
    expect(allStrings(aiWorklog).filter((text) => text.trim() === '')).toEqual([])

    const lists = [
      aiWorklog.stages.map((stage) => stage.id),
      aiWorklog.prompts.map((prompt) => prompt.text),
      aiWorklog.decisions.map((decision) => decision.title),
      aiWorklog.issues.map((item) => item.issue),
      aiWorklog.manualWork,
      aiWorklog.verification,
      aiWorklog.improvements,
    ]
    for (const list of lists) {
      expect(new Set(list).size).toBe(list.length)
    }
  })
})
