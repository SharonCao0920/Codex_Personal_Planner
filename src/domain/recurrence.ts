import { addDays, addMonthsPreserveDay, daysBetween, parseDateISO, formatDateISO } from './date'
import type { Recurrence } from './types'

const isWeekdayMatch = (date: Date, byWeekdays?: number[]): boolean => {
  if (!byWeekdays || byWeekdays.length === 0) {
    return true
  }
  return byWeekdays.includes(date.getDay())
}

const weeksBetween = (start: string, end: string): number => {
  const diff = daysBetween(start, end)
  return Math.floor(diff / 7)
}

export const ensureNextDueDate = (recurrence: Recurrence, todayISO: string): Recurrence => {
  let nextDate = parseDateISO(recurrence.nextDueDate || recurrence.startDate)
  const startDate = recurrence.startDate

  if (recurrence.freq === 'day') {
    while (formatDateISO(nextDate) < todayISO) {
      nextDate = addDays(nextDate, recurrence.interval)
    }
    return { ...recurrence, nextDueDate: formatDateISO(nextDate) }
  }

  if (recurrence.freq === 'week') {
    let guard = 0
    while (formatDateISO(nextDate) < todayISO && guard < 400) {
      nextDate = addDays(nextDate, 1)
      guard += 1
      const dateISO = formatDateISO(nextDate)
      const weeks = weeksBetween(startDate, dateISO)
      if (weeks % recurrence.interval === 0 && isWeekdayMatch(nextDate, recurrence.byWeekdays)) {
        break
      }
    }
    return { ...recurrence, nextDueDate: formatDateISO(nextDate) }
  }

  let monthlyDate = nextDate
  while (formatDateISO(monthlyDate) < todayISO) {
    monthlyDate = addMonthsPreserveDay(monthlyDate, recurrence.interval)
  }
  return { ...recurrence, nextDueDate: formatDateISO(monthlyDate) }
}

export const buildRecurrence = (params: {
  freq: Recurrence['freq']
  interval: number
  byWeekdays?: number[]
  startDate: string
}): Recurrence => {
  const baseDate = parseDateISO(params.startDate)
  const nextDueDate = formatDateISO(baseDate)
  return {
    freq: params.freq,
    interval: Math.max(1, params.interval),
    byWeekdays: params.byWeekdays && params.byWeekdays.length > 0 ? params.byWeekdays : undefined,
    startDate: params.startDate,
    nextDueDate,
  }
}

