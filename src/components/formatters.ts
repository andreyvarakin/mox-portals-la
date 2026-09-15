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

/** ISO-строку в понятные дату и время; null, если строка не является датой. */
export function formatTimestamp(iso: string): string | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : TIMESTAMP_FORMAT.format(date)
}
