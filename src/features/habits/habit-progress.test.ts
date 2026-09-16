import { describe, expect, it } from 'vitest'
import { getHabitDayProgress } from './habit-progress'
import type { Habit } from './habit-types'

const habit: Habit = {
  id: 'habit-1',
  name: 'Leer',
  description: null,
  category: null,
  status: 'active',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-15T00:00:00Z',
  currentSchedule: {
    id: 'current',
    effectiveFrom: '2026-09-10',
    effectiveUntil: null,
    targetAmount: 20,
    measurementType: 'count',
    unit: 'página',
    scheduledTime: null,
    isoWeekdays: [1, 3, 5],
  },
  latestSchedule: null,
  schedules: [{
    id: 'current',
    effectiveFrom: '2026-09-10',
    effectiveUntil: null,
    targetAmount: 20,
    measurementType: 'count',
    unit: 'página',
    scheduledTime: null,
    isoWeekdays: [1, 3, 5],
  }],
  logs: [{
    id: 'log-1',
    scheduleId: 'current',
    logDate: '2026-09-14',
    amount: 20,
    note: null,
  }],
  reminder: null,
}

describe('habit progress', () => {
  it('derives completion from the schedule target and the daily log', () => {
    expect(getHabitDayProgress(habit, '2026-09-14')).toMatchObject({
      schedule: { id: 'current' },
      amount: 20,
      completed: true,
    })
  })

  it('does not mark an unscheduled day as completed', () => {
    expect(getHabitDayProgress(habit, '2026-09-15')).toMatchObject({
      schedule: null,
      amount: 0,
      completed: false,
    })
  })
})
