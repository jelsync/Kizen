import { describe, expect, it } from 'vitest'
import { habitToFormValues, hasScheduleChanged, mapHabitRow } from './habit-mappers'
import { toHabitInput } from './habit-validation'

const row = {
  id: 'habit-1',
  name: 'Leer',
  description: null,
  category: 'Aprendizaje',
  status: 'active' as const,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-15T00:00:00Z',
  habit_schedules: [
    {
      id: 'old',
      effective_from: '2026-09-01',
      effective_until: '2026-09-10',
      target_amount: '10.00',
      measurement_type: 'count' as const,
      unit: 'página',
      scheduled_time: null,
      habit_schedule_days: [{ iso_weekday: 5 }, { iso_weekday: 1 }],
    },
    {
      id: 'current',
      effective_from: '2026-09-10',
      effective_until: null,
      target_amount: 20,
      measurement_type: 'count' as const,
      unit: 'página',
      scheduled_time: '19:30:00',
      habit_schedule_days: [{ iso_weekday: 3 }, { iso_weekday: 1 }],
    },
  ],
}

describe('habit mappers', () => {
  it('selects the open schedule and sorts weekdays', () => {
    const habit = mapHabitRow(row)

    expect(habit.currentSchedule?.id).toBe('current')
    expect(habit.currentSchedule?.scheduledTime).toBe('19:30')
    expect(habit.currentSchedule?.isoWeekdays).toEqual([1, 3])
  })

  it('prefills a form from the current schedule', () => {
    const values = habitToFormValues(mapHabitRow(row))

    expect(values).toMatchObject({ name: 'Leer', targetAmount: '20', scheduledTime: '19:30' })
  })

  it('detects meaningful schedule changes', () => {
    const habit = mapHabitRow(row)
    const unchanged = toHabitInput(habitToFormValues(habit))

    expect(hasScheduleChanged(habit, unchanged)).toBe(false)
    expect(hasScheduleChanged(habit, { ...unchanged, targetAmount: 25 })).toBe(true)
  })
})
