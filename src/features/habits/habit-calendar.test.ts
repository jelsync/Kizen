import { describe, expect, it } from 'vitest'
import { buildHabitCalendar, shiftCalendarMonth } from './habit-calendar'
import type { Habit } from './habit-types'

function makeHabit(): Habit {
  return {
    id: 'habit-1',
    name: 'Leer',
    description: null,
    category: null,
    status: 'active',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
    currentSchedule: null,
    latestSchedule: null,
    schedules: [
      {
        id: 'new',
        effectiveFrom: '2026-09-10',
        effectiveUntil: null,
        targetAmount: 20,
        measurementType: 'count',
        unit: 'página',
        scheduledTime: null,
        isoWeekdays: [1, 2, 3, 4, 5, 6],
      },
      {
        id: 'old',
        effectiveFrom: '2026-08-01',
        effectiveUntil: '2026-09-10',
        targetAmount: 10,
        measurementType: 'count',
        unit: 'página',
        scheduledTime: null,
        isoWeekdays: [1, 2, 3, 4, 5, 6, 7],
      },
    ],
    logs: [
      { id: 'old-log', scheduleId: 'old', logDate: '2026-09-09', amount: 10, note: null },
      { id: 'new-log', scheduleId: 'new', logDate: '2026-09-11', amount: 20, note: null },
    ],
  }
}

describe('habit calendar', () => {
  it('derives completed, missed, scheduled, unscheduled, and today states', () => {
    const calendar = buildHabitCalendar(makeHabit(), '2026-09', '2026-09-15')
    const byDate = new Map(calendar.days.map((day) => [day.date, day]))

    expect(byDate.get('2026-09-09')).toMatchObject({ kind: 'completed', schedule: { id: 'old' } })
    expect(byDate.get('2026-09-07')).toMatchObject({ kind: 'missed', schedule: { id: 'old' } })
    expect(byDate.get('2026-09-11')).toMatchObject({ kind: 'completed', schedule: { id: 'new' } })
    expect(byDate.get('2026-09-15')).toMatchObject({ kind: 'scheduled', isToday: true })
    expect(byDate.get('2026-09-13')).toMatchObject({ kind: 'unscheduled' })
  })

  it('uses the schedule version at each effective boundary', () => {
    const calendar = buildHabitCalendar(makeHabit(), '2026-09', '2026-09-15')
    const byDate = new Map(calendar.days.map((day) => [day.date, day]))

    expect(byDate.get('2026-09-09')?.schedule?.id).toBe('old')
    expect(byDate.get('2026-09-10')?.schedule?.id).toBe('new')
    expect(byDate.get('2026-09-10')?.kind).toBe('missed')
  })

  it('keeps civil month boundaries stable and pads a Monday-first grid', () => {
    const calendar = buildHabitCalendar(makeHabit(), '2026-09', '2026-09-15')

    expect(calendar.days).toHaveLength(42)
    expect(calendar.days[0]).toMatchObject({ date: '2026-08-31', isOutsideMonth: true })
    expect(calendar.days[31]).toMatchObject({ date: '2026-10-01', isOutsideMonth: true })
    expect(shiftCalendarMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftCalendarMonth('2026-12', 1)).toBe('2027-01')
  })
})
