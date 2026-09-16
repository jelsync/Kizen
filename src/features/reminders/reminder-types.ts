import type { HabitReminder, ReminderChannel } from '../habits/habit-types'

export type ReminderInput = Readonly<{
  habitId: string
  userId: string
  minutesBefore: number
  isEnabled: boolean
}>

export type ReminderQueryRow = Readonly<{
  id: string
  habit_id: string
  channel: ReminderChannel
  minutes_before: number | string
  is_enabled: boolean
  created_at: string
  updated_at: string
}>

export function mapReminderRow(row: ReminderQueryRow): HabitReminder {
  return {
    id: row.id,
    habitId: row.habit_id,
    channel: row.channel,
    minutesBefore: Number(row.minutes_before),
    isEnabled: row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const REMINDER_OFFSETS = [0, 5, 10, 15, 30, 60] as const

export function formatReminderOffset(minutesBefore: number): string {
  if (minutesBefore === 0) return 'A la hora del hábito'
  return `${minutesBefore} min antes`
}
