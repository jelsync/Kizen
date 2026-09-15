import { describe, expect, it } from 'vitest'
import { getHabitMetrics } from './habit-metrics'
import type { Habit } from './habit-types'

function makeHabit(
  schedules: Habit['schedules'],
  logs: Habit['logs'],
  status: Habit['status'] = 'active',
): Habit {
  return {
    id: 'habit-1',
    name: 'Leer',
    description: null,
    category: null,
    status,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
    currentSchedule: schedules.find((schedule) => schedule.effectiveUntil === null) ?? null,
    latestSchedule: schedules[0] ?? null,
    schedules,
    logs,
  }
}

function schedule(
  id: string,
  effectiveFrom: string,
  effectiveUntil: string | null = null,
  targetAmount = 10,
  isoWeekdays = [1, 2, 3, 4, 5, 6, 7],
) {
  return {
    id,
    effectiveFrom,
    effectiveUntil,
    targetAmount,
    measurementType: 'count' as const,
    unit: 'repetición',
    scheduledTime: null,
    isoWeekdays,
  }
}

function log(id: string, scheduleId: string, logDate: string, amount = 10) {
  return { id, scheduleId, logDate, amount, note: null }
}

describe('habit metrics', () => {
  it('does not let an unfinished current day break the current streak', () => {
    const habit = makeHabit(
      [schedule('current', '2026-09-10')],
      [
        log('1', 'current', '2026-09-13'),
        log('2', 'current', '2026-09-14'),
      ],
    )

    const metrics = getHabitMetrics(habit, '2026-09-15')

    expect(metrics.currentStreak).toBe(2)
    expect(metrics.bestStreak).toBe(2)
    expect(metrics.period).toMatchObject({
      expectedDays: 6,
      completedDays: 2,
      missedDays: 4,
      completionRate: 2 / 6,
    })
  })

  it('calculates schedules by their version instead of applying the latest target historically', () => {
    const habit = makeHabit(
      [
        schedule('new', '2026-09-10', null, 20),
        schedule('old', '2026-09-01', '2026-09-10', 10),
      ],
      [
        log('1', 'old', '2026-09-01'),
        log('2', 'old', '2026-09-02'),
        log('3', 'old', '2026-09-03'),
        log('4', 'old', '2026-09-04'),
        log('5', 'old', '2026-09-05'),
        log('6', 'old', '2026-09-06'),
        log('7', 'old', '2026-09-07'),
        log('8', 'old', '2026-09-08'),
        log('9', 'old', '2026-09-09'),
        log('10', 'new', '2026-09-10', 10),
      ],
    )

    const metrics = getHabitMetrics(habit, '2026-09-10')

    expect(metrics.totals.expectedDays).toBe(10)
    expect(metrics.totals.completedDays).toBe(9)
    expect(metrics.totals.progressRate).toBeCloseTo(0.95)
  })

  it('excludes paused days from expected totals and streak breaks', () => {
    const habit = makeHabit(
      [
        schedule('new', '2026-09-10'),
        schedule('old', '2026-09-01', '2026-09-04'),
      ],
      [
        log('1', 'old', '2026-09-01'),
        log('2', 'old', '2026-09-02'),
        log('3', 'old', '2026-09-03'),
        log('4', 'new', '2026-09-10'),
        log('5', 'new', '2026-09-11'),
        log('6', 'new', '2026-09-12'),
        log('7', 'new', '2026-09-13'),
        log('8', 'new', '2026-09-14'),
      ],
    )

    const metrics = getHabitMetrics(habit, '2026-09-15')

    expect(metrics.totals.expectedDays).toBe(9)
    expect(metrics.totals.completedDays).toBe(8)
    expect(metrics.currentStreak).toBe(8)
    expect(metrics.bestStreak).toBe(8)
  })

  it('uses a rolling thirty-day period and never includes future occurrences', () => {
    const habit = makeHabit(
      [schedule('current', '2026-08-01')],
      [
        log('1', 'current', '2026-08-16'),
        log('2', 'current', '2026-08-17'),
        log('3', 'current', '2026-09-15'),
      ],
    )

    const metrics = getHabitMetrics(habit, '2026-09-15')

    expect(metrics.period.from).toBe('2026-08-17')
    expect(metrics.period.to).toBe('2026-09-15')
    expect(metrics.period.expectedDays).toBe(30)
    expect(metrics.period.completedDays).toBe(2)
  })

  it('keeps archived history without creating current occurrences', () => {
    const habit = makeHabit(
      [schedule('archived', '2026-09-01', '2026-09-10')],
      [log('1', 'archived', '2026-09-09')],
      'archived',
    )

    const metrics = getHabitMetrics(habit, '2026-09-15')

    expect(metrics.totals).toMatchObject({
      expectedDays: 9,
      completedDays: 1,
    })
    expect(metrics.currentStreak).toBe(1)
  })
})
