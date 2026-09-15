import { describe, expect, it } from 'vitest'
import { EMPTY_HABIT_FORM } from './habit-types'
import { toHabitInput, validateHabit } from './habit-validation'

describe('habit validation', () => {
  it('accepts a complete duration habit', () => {
    expect(validateHabit({ ...EMPTY_HABIT_FORM, name: 'Estudiar inglés' })).toEqual({})
  })

  it('requires a name, positive target and at least one day', () => {
    const errors = validateHabit({
      ...EMPTY_HABIT_FORM,
      name: '   ',
      targetAmount: '0',
      isoWeekdays: [],
    })

    expect(errors.name).toBeDefined()
    expect(errors.targetAmount).toBeDefined()
    expect(errors.isoWeekdays).toBeDefined()
  })

  it('rejects more than two decimals and an invalid time', () => {
    const errors = validateHabit({
      ...EMPTY_HABIT_FORM,
      name: 'Leer',
      targetAmount: '1.234',
      scheduledTime: '25:80',
    })

    expect(errors.targetAmount).toBeDefined()
    expect(errors.scheduledTime).toBeDefined()
  })

  it('normalizes optional values, unit and weekdays for Supabase', () => {
    const input = toHabitInput({
      ...EMPTY_HABIT_FORM,
      name: '  Leer  ',
      description: ' ',
      category: ' Estudio ',
      targetAmount: '12.5',
      measurementType: 'custom',
      unit: ' PÁGINA ',
      isoWeekdays: [5, 1, 3],
    })

    expect(input).toMatchObject({
      name: 'Leer',
      description: null,
      category: 'Estudio',
      targetAmount: 12.5,
      unit: 'página',
      isoWeekdays: [1, 3, 5],
    })
  })
})
