import { getSupabaseClient } from '../../lib/supabase'
import { getBrowserTimeZone } from './habit-dates'
import { mapHabitRow, type HabitQueryRow } from './habit-mappers'
import type { Habit, HabitInput } from './habit-types'

export type HabitWorkspace = Readonly<{ habits: Habit[]; timeZone: string }>

const habitsSelect = `
  id,
  name,
  description,
  category,
  status,
  created_at,
  updated_at,
  habit_schedules (
    id,
    effective_from,
    effective_until,
    target_amount,
    measurement_type,
    unit,
    scheduled_time,
    habit_schedule_days (iso_weekday)
  )
`

function readErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message)
  }
  return ''
}

export function toHabitError(error: unknown): Error {
  const message = readErrorMessage(error)

  if (message.includes('Authentication required')) {
    return new Error('Tu sesión expiró. Cierra sesión e inicia sesión nuevamente.')
  }
  if (message.includes('Profile does not exist')) {
    return new Error('Tu perfil todavía no está listo. Actualiza la página e inténtalo otra vez.')
  }
  if (message.includes('A new habit must start today')) {
    return new Error('Cambió tu día local mientras guardábamos. Actualiza la página e inténtalo otra vez.')
  }
  if (message.includes('Target amount must be positive')) {
    return new Error('La meta debe ser un número positivo.')
  }
  if (message.includes('Invalid measurement type')) {
    return new Error('Selecciona una forma válida de medir el progreso.')
  }
  if (message.includes('Unit is required')) {
    return new Error('Escribe la unidad de la meta.')
  }
  if (message.includes('Duration must use minute as its unit')) {
    return new Error('Los hábitos por duración deben usar minutos.')
  }
  if (message.includes('Weekdays must be unique ISO values from 1 to 7')) {
    return new Error('Selecciona al menos un día válido.')
  }
  if (message.includes('Could not find the function')) {
    return new Error('La base de datos aún no tiene la última versión. Aplica las migraciones e inténtalo otra vez.')
  }
  if (message.includes('Today already has progress')) {
    return new Error('Este hábito ya tiene progreso hoy. Realiza este cambio mañana.')
  }
  if (message.includes('must start today') || message.includes('must take effect today')) {
    return new Error('Cambió tu día local mientras guardábamos. Actualiza la página e inténtalo otra vez.')
  }
  if (message.includes('not found or not owned')) {
    return new Error('No encontramos el hábito o ya no tienes acceso a él.')
  }
  if (message.includes('Archived habits')) {
    return new Error('Los hábitos archivados no pueden reactivarse.')
  }

  return new Error('No pudimos guardar el cambio. Inténtalo nuevamente.')
}

async function getProfileTimeZone(userId: string): Promise<string> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('time_zone')
    .eq('id', userId)
    .single()

  if (error || !data) throw new Error('No pudimos cargar la zona horaria de tu perfil.')

  const profileTimeZone = String(data.time_zone)
  const browserTimeZone = getBrowserTimeZone()
  if (profileTimeZone !== 'UTC' || browserTimeZone === 'UTC') return profileTimeZone

  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({ time_zone: browserTimeZone })
    .eq('id', userId)
    .eq('time_zone', 'UTC')
    .select('time_zone')
    .maybeSingle()

  if (updateError) throw new Error('No pudimos configurar la zona horaria de tu perfil.')
  return updatedProfile ? String(updatedProfile.time_zone) : profileTimeZone
}

export async function loadHabitWorkspace(userId: string): Promise<HabitWorkspace> {
  const timeZone = await getProfileTimeZone(userId)
  const { data, error } = await getSupabaseClient()
    .from('habits')
    .select(habitsSelect)
    .order('created_at', { ascending: false })

  if (error) throw new Error('No pudimos cargar tus hábitos.')

  return {
    habits: ((data ?? []) as unknown as HabitQueryRow[]).map(mapHabitRow),
    timeZone,
  }
}

export function buildScheduleArguments(input: HabitInput, effectiveFrom: string) {
  return {
    p_effective_from: effectiveFrom,
    p_target_amount: input.targetAmount,
    p_measurement_type: input.measurementType,
    p_unit: input.unit,
    p_scheduled_time: input.scheduledTime,
    p_iso_weekdays: input.isoWeekdays,
  }
}

export function buildCreateHabitArguments(input: HabitInput, localToday: string) {
  return {
    p_name: input.name,
    p_description: input.description,
    p_category: input.category,
    ...buildScheduleArguments(input, localToday),
  }
}

export function buildStatusArguments(
  habitId: string,
  status: 'paused' | 'archived',
  localToday: string,
) {
  return {
    p_habit_id: habitId,
    p_status: status,
    p_effective_on: localToday,
  }
}

export function buildUpdateHabitArguments(
  habitId: string,
  input: HabitInput,
  replaceSchedule: boolean,
  localToday: string,
) {
  return {
    p_habit_id: habitId,
    p_name: input.name,
    p_description: input.description,
    p_category: input.category,
    p_replace_schedule: replaceSchedule,
    ...buildScheduleArguments(input, localToday),
  }
}

export async function createHabit(input: HabitInput, localToday: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc(
    'create_habit_with_schedule',
    buildCreateHabitArguments(input, localToday),
  )

  if (error) throw toHabitError(error)
}

export async function updateHabit(
  habitId: string,
  input: HabitInput,
  replaceSchedule: boolean,
  localToday: string,
): Promise<void> {
  const { error } = await getSupabaseClient().rpc(
    'update_habit_with_schedule',
    buildUpdateHabitArguments(habitId, input, replaceSchedule, localToday),
  )

  if (error) throw toHabitError(error)
}

export async function setHabitStatus(
  habitId: string,
  status: 'paused' | 'archived',
  localToday: string,
): Promise<void> {
  const { error } = await getSupabaseClient().rpc(
    'set_habit_status',
    buildStatusArguments(habitId, status, localToday),
  )

  if (error) throw toHabitError(error)
}

export async function deleteHabitPermanently(habitId: string): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('habits')
    .delete()
    .eq('id', habitId)
    .select('id')
    .maybeSingle()

  if (error) throw toHabitError(error)
  if (!data) throw new Error('No encontramos el hábito o ya no tienes acceso a él.')
}
