export type HabitStatus = 'active' | 'paused' | 'archived'
export type MeasurementType = 'duration' | 'count' | 'custom'

export type HabitSchedule = Readonly<{
  id: string
  effectiveFrom: string
  effectiveUntil: string | null
  targetAmount: number
  measurementType: MeasurementType
  unit: string
  scheduledTime: string | null
  isoWeekdays: number[]
}>

export type Habit = Readonly<{
  id: string
  name: string
  description: string | null
  category: string | null
  status: HabitStatus
  createdAt: string
  updatedAt: string
  currentSchedule: HabitSchedule | null
  latestSchedule: HabitSchedule | null
}>

export type HabitInput = Readonly<{
  name: string
  description: string | null
  category: string | null
  targetAmount: number
  measurementType: MeasurementType
  unit: string
  scheduledTime: string | null
  isoWeekdays: number[]
}>

export type HabitFormValues = Readonly<{
  name: string
  description: string
  category: string
  targetAmount: string
  measurementType: MeasurementType
  unit: string
  scheduledTime: string
  isoWeekdays: number[]
}>

export type HabitFilter = 'active' | 'paused' | 'archived'

export const ISO_WEEKDAYS = [
  { value: 1, shortLabel: 'L', label: 'Lunes' },
  { value: 2, shortLabel: 'M', label: 'Martes' },
  { value: 3, shortLabel: 'X', label: 'Miércoles' },
  { value: 4, shortLabel: 'J', label: 'Jueves' },
  { value: 5, shortLabel: 'V', label: 'Viernes' },
  { value: 6, shortLabel: 'S', label: 'Sábado' },
  { value: 7, shortLabel: 'D', label: 'Domingo' },
] as const

export const EMPTY_HABIT_FORM: HabitFormValues = {
  name: '',
  description: '',
  category: '',
  targetAmount: '30',
  measurementType: 'duration',
  unit: 'minute',
  scheduledTime: '',
  isoWeekdays: [1, 2, 3, 4, 5, 6, 7],
}
