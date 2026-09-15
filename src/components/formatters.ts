export function formatCollapseMinutes(minutes: number | null): string {
  return minutes === null ? '—' : `${minutes} мин`
}

/** Значение шкалы 0–100: не больше двух знаков после запятой. */
export function formatOutOf100(value: number): string {
  return `${Math.round(value * 100) / 100} / 100`
}

const TIMESTAMP_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const RU_PLURAL = new Intl.PluralRules('ru-RU')

const EVENT_WORDS: Record<Intl.LDMLPluralRule, string> = {
  zero: 'событий',
  one: 'событие',
  two: 'события',
  few: 'события',
  many: 'событий',
  other: 'события',
}

/** «1 событие», «2 события», «5 событий» — склонение по правилам русского языка из Intl. */
export function formatEventCount(count: number): string {
  return `${count} ${EVENT_WORDS[RU_PLURAL.select(count)]}`
}

/** ISO-строку в понятные дату и время; null, если строка не является датой. */
export function formatTimestamp(iso: string): string | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : TIMESTAMP_FORMAT.format(date)
}
