import { getHabitDayProgress } from './habit-progress'
import type { HabitDayProgress } from './habit-progress'
import type { Habit, HabitSchedule } from './habit-types'

export type HabitPeriodSummary = Readonly<{
  from: string | null
  to: string | null
  expectedDays: number
  completedDays: number
  loggedDays: number
  missedDays: number
  completionRate: number | null
  progressRate: number | null
}>

export type HabitMetrics = Readonly<{
  currentStreak: number
  bestStreak: number
  period: HabitPeriodSummary
  totals: HabitPeriodSummary
}>

type HabitOccurrence = Readonly<{
  date: string
  schedule: HabitSchedule
  progress: HabitDayProgress
}>

const DEFAULT_PERIOD_DAYS = 30

function shiftCivilDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`)
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return shifted.toISOString().slice(0, 10)
}

function earliestScheduleDate(habit: Habit): string | null {
  return habit.schedules.reduce<string | null>(
    (earliest, schedule) => earliest === null || schedule.effectiveFrom < earliest
      ? schedule.effectiveFrom
      : earliest,
    null,
  )
}

function listExpectedOccurrences(habit: Habit, from: string, to: string): HabitOccurrence[] {
  if (from > to) return []

  const occurrences: HabitOccurrence[] = []
  for (let date = from; date <= to; date = shiftCivilDate(date, 1)) {
    const progress = getHabitDayProgress(habit, date)
    if (progress.schedule) {
      occurrences.push({
        date,
        schedule: progress.schedule,
        progress,
      })
    }
  }

  return occurrences
}

function summarize(
  occurrences: ReadonlyArray<HabitOccurrence>,
  from: string | null,
  to: string | null,
): HabitPeriodSummary {
  const completedDays = occurrences.filter(({ progress }) => progress.completed).length
  const loggedDays = occurrences.filter(({ progress }) => progress.log !== null).length
  const progressTotal = occurrences.reduce((total, { progress, schedule }) => (
    total + Math.min(progress.amount / schedule.targetAmount, 1)
  ), 0)
  const expectedDays = occurrences.length

  return {
    from,
    to,
    expectedDays,
    completedDays,
    loggedDays,
    missedDays: expectedDays - completedDays,
    completionRate: expectedDays === 0 ? null : completedDays / expectedDays,
    progressRate: expectedDays === 0 ? null : progressTotal / expectedDays,
  }
}

function calculateBestStreak(occurrences: ReadonlyArray<HabitOccurrence>): number {
  let best = 0
  let current = 0

  for (const occurrence of occurrences) {
    if (occurrence.progress.completed) {
      current += 1
      best = Math.max(best, current)
    } else {
      current = 0
    }
  }

  return best
}

function calculateCurrentStreak(
  occurrences: ReadonlyArray<HabitOccurrence>,
  today: string,
): number {
  let current = 0
  let skippedToday = false

  for (let index = occurrences.length - 1; index >= 0; index -= 1) {
    const occurrence = occurrences[index]
    if (!occurrence.progress.completed && occurrence.date === today && !skippedToday) {
      skippedToday = true
      continue
    }
    if (!occurrence.progress.completed) break
    current += 1
  }

  return current
}

export function getHabitMetrics(
  habit: Habit,
  today: string,
  periodDays = DEFAULT_PERIOD_DAYS,
): HabitMetrics {
  const firstDate = earliestScheduleDate(habit)
  if (!firstDate || firstDate > today) {
    const empty = summarize([], null, null)
    return {
      currentStreak: 0,
      bestStreak: 0,
      period: empty,
      totals: empty,
    }
  }

  const allOccurrences = listExpectedOccurrences(habit, firstDate, today)
  const periodStart = firstDate > shiftCivilDate(today, -(periodDays - 1))
    ? firstDate
    : shiftCivilDate(today, -(periodDays - 1))
  const periodOccurrences = allOccurrences.filter(({ date }) => date >= periodStart)

  return {
    currentStreak: calculateCurrentStreak(allOccurrences, today),
    bestStreak: calculateBestStreak(allOccurrences),
    period: summarize(periodOccurrences, periodStart, today),
    totals: summarize(allOccurrences, firstDate, today),
  }
}
