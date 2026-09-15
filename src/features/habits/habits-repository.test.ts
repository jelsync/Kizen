import { describe, expect, it } from 'vitest'
import {
  buildCreateHabitArguments,
  buildStatusArguments,
  buildUpdateHabitArguments,
  toHabitError,
} from './habits-repository'

const input = {
  name: 'Leer',
  description: null,
  category: 'Aprendizaje',
  targetAmount: 20,
  measurementType: 'count' as const,
  unit: 'página',
  scheduledTime: '19:30',
  isoWeekdays: [1, 3, 5],
}

describe('habit repository errors', () => {
  it('explains changes rejected after progress was recorded', () => {
    expect(toHabitError({ message: 'Today already has progress; apply the status tomorrow' }).message)
      .toContain('progreso hoy')
  })

  it('does not expose unknown database details', () => {
    expect(toHabitError({ message: 'sensitive database detail' }).message)
      .toBe('No pudimos guardar el cambio. Inténtalo nuevamente.')
  })

  it('builds the exact creation RPC payload', () => {
    expect(buildCreateHabitArguments(input, '2026-09-15')).toEqual({
      p_name: 'Leer',
      p_description: null,
      p_category: 'Aprendizaje',
      p_effective_from: '2026-09-15',
      p_target_amount: 20,
      p_measurement_type: 'count',
      p_unit: 'página',
      p_scheduled_time: '19:30',
      p_iso_weekdays: [1, 3, 5],
    })
  })

  it('builds status changes without accepting an owner id', () => {
    expect(buildStatusArguments('habit-1', 'archived', '2026-09-15')).toEqual({
      p_habit_id: 'habit-1',
      p_status: 'archived',
      p_effective_on: '2026-09-15',
    })
  })

  it('builds one atomic payload for details and schedule changes', () => {
    expect(buildUpdateHabitArguments('habit-1', input, true, '2026-09-15')).toMatchObject({
      p_habit_id: 'habit-1',
      p_name: 'Leer',
      p_replace_schedule: true,
      p_effective_from: '2026-09-15',
      p_target_amount: 20,
    })
  })
})
