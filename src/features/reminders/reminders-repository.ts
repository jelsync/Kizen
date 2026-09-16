import { getSupabaseClient } from '../../lib/supabase'
import { mapReminderRow, type ReminderInput, type ReminderQueryRow } from './reminder-types'
import type { HabitReminder } from '../habits/habit-types'

const reminderSelect = 'id, habit_id, channel, minutes_before, is_enabled, created_at, updated_at'

export async function loadBrowserReminders(habitIds: string[]): Promise<HabitReminder[]> {
  if (habitIds.length === 0) return []

  const { data, error } = await getSupabaseClient()
    .from('reminders')
    .select(reminderSelect)
    .eq('channel', 'browser')
    .in('habit_id', habitIds)

  if (error) throw new Error('No pudimos cargar tus recordatorios.')
  return ((data ?? []) as unknown as ReminderQueryRow[]).map(mapReminderRow)
}

export async function saveBrowserReminder(input: ReminderInput): Promise<HabitReminder> {
  const { data, error } = await getSupabaseClient().rpc('set_browser_reminder', {
    p_habit_id: input.habitId,
    p_minutes_before: input.minutesBefore,
    p_is_enabled: input.isEnabled,
  })

  if (error || !data) throw new Error('No pudimos guardar el recordatorio.')
  return mapReminderRow(data as unknown as ReminderQueryRow)
}

export async function removeBrowserReminder(reminderId: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('reminders')
    .delete()
    .eq('id', reminderId)

  if (error) throw new Error('No pudimos eliminar el recordatorio.')
}
