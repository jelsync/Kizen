import {
  EMPTY_HABIT_FORM,
  type Habit,
  type HabitFormValues,
  type HabitInput,
  type HabitSchedule,
  type HabitStatus,
  type MeasurementType,
} from './habit-types'

export type HabitScheduleQueryRow = Readonly<{
  id: string
  effective_from: string
  effective_until: string | null
  target_amount: number | string
  measurement_type: MeasurementType
  unit: string
  scheduled_time: string | null
  habit_schedule_days: ReadonlyArray<{ iso_weekday: number }>
}>

export type HabitLogQueryRow = Readonly<{
  id: string
  schedule_id: string
  log_date: string
  amount: number | string
  note: string | null
}>

export type HabitQueryRow = Readonly<{
  id: string
  name: string
  description: string | null
  category: string | null
  status: HabitStatus
  created_at: string
  updated_at: string
  habit_schedules: HabitScheduleQueryRow[]
  habit_logs: HabitLogQueryRow[]
}>

function mapSchedule(row: HabitScheduleQueryRow): HabitSchedule {
  return {
    id: row.id,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    targetAmount: Number(row.target_amount),
    measurementType: row.measurement_type,
    unit: row.unit,
    scheduledTime: row.scheduled_time?.slice(0, 5) ?? null,
    isoWeekdays: row.habit_schedule_days
      .map((day) => day.iso_weekday)
      .sort((left, right) => left - right),
  }
}

export function mapHabitRow(row: HabitQueryRow): Habit {
  const schedules = row.habit_schedules
    .map(mapSchedule)
    .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom))
  const logs = row.habit_logs
    .map((log) => ({
      id: log.id,
      scheduleId: log.schedule_id,
      logDate: log.log_date,
      amount: Number(log.amount),
      note: log.note,
    }))
    .sort((left, right) => right.logDate.localeCompare(left.logDate))

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentSchedule: schedules.find((schedule) => schedule.effectiveUntil === null) ?? null,
    latestSchedule: schedules[0] ?? null,
    schedules,
    logs,
  }
}

export function habitToFormValues(habit: Habit): HabitFormValues {
  const schedule = habit.currentSchedule ?? habit.latestSchedule
  if (!schedule) {
    return {
      ...EMPTY_HABIT_FORM,
      name: habit.name,
      description: habit.description ?? '',
      category: habit.category ?? '',
    }
  }

  return {
    name: habit.name,
    description: habit.description ?? '',
    category: habit.category ?? '',
    targetAmount: String(schedule.targetAmount),
    measurementType: schedule.measurementType,
    unit: schedule.unit,
    scheduledTime: schedule.scheduledTime ?? '',
    isoWeekdays: schedule.isoWeekdays,
  }
}

export function hasScheduleChanged(habit: Habit, input: HabitInput): boolean {
  const schedule = habit.currentSchedule
  if (!schedule) return true

  return schedule.targetAmount !== input.targetAmount
    || schedule.measurementType !== input.measurementType
    || schedule.unit !== input.unit
    || schedule.scheduledTime !== input.scheduledTime
    || schedule.isoWeekdays.join(',') !== input.isoWeekdays.join(',')
}
