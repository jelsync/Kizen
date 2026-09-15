import type { Habit, HabitLog, HabitSchedule } from './habit-types'

export type HabitDayProgress = Readonly<{
  schedule: HabitSchedule | null
  log: HabitLog | null
  amount: number
  completed: boolean
}>

function isoWeekday(date: string): number {
  const parsed = new Date(`${date}T00:00:00Z`)
  const day = parsed.getUTCDay()
  return day === 0 ? 7 : day
}

export function findScheduleForDate(habit: Habit, date: string): HabitSchedule | null {
  const weekday = isoWeekday(date)
  return habit.schedules.find((schedule) => (
    schedule.effectiveFrom <= date
    && (schedule.effectiveUntil === null || date < schedule.effectiveUntil)
    && schedule.isoWeekdays.includes(weekday)
  )) ?? null
}

export function getHabitDayProgress(habit: Habit, date: string): HabitDayProgress {
  const schedule = findScheduleForDate(habit, date)
  const log = habit.logs.find((entry) => entry.logDate === date) ?? null
  const amount = log?.amount ?? 0

  return {
    schedule,
    log,
    amount,
    completed: Boolean(schedule && log && amount >= schedule.targetAmount),
  }
}

