export const formatDateISO = (date: Date): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const parseDateISO = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export const todayISO = (): string => formatDateISO(new Date())

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export const addWeeks = (date: Date, weeks: number): Date => addDays(date, weeks * 7)

export const addMonthsPreserveDay = (date: Date, months: number): Date => {
  const year = date.getFullYear()
  const month = date.getMonth() + months
  const day = date.getDate()
  const tentative = new Date(year, month, day)
  if (tentative.getMonth() !== ((month % 12) + 12) % 12) {
    return new Date(year, month + 1, 0)
  }
  return tentative
}

export const isBeforeOrEqual = (a: string, b: string): boolean => {
  return parseDateISO(a).getTime() <= parseDateISO(b).getTime()
}

export const daysBetween = (start: string, end: string): number => {
  const startDate = parseDateISO(start)
  const endDate = parseDateISO(end)
  const diff = endDate.getTime() - startDate.getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}
