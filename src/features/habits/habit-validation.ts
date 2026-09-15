import type { HabitFormValues, HabitInput } from './habit-types'

export type HabitFormField = keyof HabitFormValues
export type HabitFormErrors = Partial<Record<HabitFormField, string>>

const decimalPattern = /^\d+(?:\.\d{1,2})?$/
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export function validateHabit(values: HabitFormValues): HabitFormErrors {
  const errors: HabitFormErrors = {}
  const name = values.name.trim()
  const description = values.description.trim()
  const category = values.category.trim()
  const unit = values.unit.trim()
  const amount = Number(values.targetAmount)

  if (!name) errors.name = 'Escribe un nombre para el hábito.'
  else if (name.length > 120) errors.name = 'El nombre no puede superar 120 caracteres.'

  if (description.length > 1000) {
    errors.description = 'La descripción no puede superar 1000 caracteres.'
  }
  if (category.length > 60) errors.category = 'La categoría no puede superar 60 caracteres.'

  if (!decimalPattern.test(values.targetAmount.trim()) || !Number.isFinite(amount) || amount <= 0) {
    errors.targetAmount = 'La meta debe ser un número positivo con máximo dos decimales.'
  } else if (amount > 9_999_999_999.99) {
    errors.targetAmount = 'La meta es demasiado grande.'
  }

  if (values.measurementType === 'duration' && unit !== 'minute') {
    errors.unit = 'Los hábitos por duración se guardan en minutos.'
  } else if (!unit) {
    errors.unit = 'Escribe la unidad de la meta.'
  } else if (unit.length > 32) {
    errors.unit = 'La unidad no puede superar 32 caracteres.'
  }

  if (values.scheduledTime && !timePattern.test(values.scheduledTime)) {
    errors.scheduledTime = 'Selecciona una hora válida.'
  }

  const uniqueDays = new Set(values.isoWeekdays)
  if (
    values.isoWeekdays.length === 0
    || uniqueDays.size !== values.isoWeekdays.length
    || values.isoWeekdays.some((day) => day < 1 || day > 7)
  ) {
    errors.isoWeekdays = 'Selecciona al menos un día válido.'
  }

  return errors
}

export function toHabitInput(values: HabitFormValues): HabitInput {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    category: values.category.trim() || null,
    targetAmount: Number(values.targetAmount),
    measurementType: values.measurementType,
    unit: values.measurementType === 'duration' ? 'minute' : values.unit.trim().toLowerCase(),
    scheduledTime: values.scheduledTime || null,
    isoWeekdays: [...values.isoWeekdays].sort((left, right) => left - right),
  }
}
