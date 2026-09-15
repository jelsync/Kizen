import { getHabitDayProgress } from './habit-progress'
import type { Habit, HabitLog, HabitSchedule } from './habit-types'

export type HabitCalendarDayKind = 'completed' | 'missed' | 'scheduled' | 'unscheduled'

export type HabitCalendarDay = Readonly<{
  date: string
  dayOfMonth: number
  isOutsideMonth: boolean
  isToday: boolean
  kind: HabitCalendarDayKind
  schedule: HabitSchedule | null
  log: HabitLog | null
  amount: number
  completed: boolean
}>

export type HabitCalendar = Readonly<{
  month: string
  days: HabitCalendarDay[]
}>

function shiftCivilDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`)
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return shifted.toISOString().slice(0, 10)
}

function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
}

function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}

function isCalendarMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

function normalizeMonth(month: string): string {
  return isCalendarMonth(month) ? month : '1970-01'
}

function getDay(
  habit: Habit,
  date: string,
  month: string,
  today: string,
): HabitCalendarDay {
  const isOutsideMonth = date.slice(0, 7) !== month
  if (isOutsideMonth) {
    return {
      date,
      dayOfMonth: Number(date.slice(8, 10)),
      isOutsideMonth: true,
      isToday: false,
      kind: 'unscheduled',
      schedule: null,
      log: null,
      amount: 0,
      completed: false,
    }
  }

  const progress = getHabitDayProgress(habit, date)
  const kind: HabitCalendarDayKind = progress.completed
    ? 'completed'
    : progress.schedule && date < today
      ? 'missed'
      : progress.schedule
        ? 'scheduled'
        : 'unscheduled'

  return {
    date,
    dayOfMonth: Number(date.slice(8, 10)),
    isOutsideMonth: false,
    isToday: date === today,
    kind,
    schedule: progress.schedule,
    log: progress.log,
    amount: progress.amount,
    completed: progress.completed,
  }
}

export function buildHabitCalendar(
  habit: Habit,
  month: string,
  today: string,
): HabitCalendar {
  const normalizedMonth = normalizeMonth(month)
  const firstDate = `${normalizedMonth}-01`
  const leadingDays = isoWeekday(firstDate) - 1
  const firstGridDate = shiftCivilDate(firstDate, -leadingDays)
  const days = Array.from({ length: 42 }, (_, index) => (
    getDay(habit, shiftCivilDate(firstGridDate, index), normalizedMonth, today)
  ))

  return { month: normalizedMonth, days }
}

export function shiftCalendarMonth(month: string, amount: number): string {
  const normalizedMonth = normalizeMonth(month)
  const [year, monthNumber] = normalizedMonth.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + amount, 1))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`
}

export function formatCalendarMonth(month: string): string {
  const normalizedMonth = normalizeMonth(month)
  return new Intl.DateTimeFormat('es', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${normalizedMonth}-01T00:00:00Z`))
}

export function getCalendarMonthBounds(month: string): Readonly<{ from: string; to: string }> {
  const normalizedMonth = normalizeMonth(month)
  return {
    from: `${normalizedMonth}-01`,
    to: `${normalizedMonth}-${String(daysInMonth(normalizedMonth)).padStart(2, '0')}`,
  }
}
