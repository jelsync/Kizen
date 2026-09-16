import { useState } from 'react'
import type { Habit } from '../habits/habit-types'
import { browserNotificationsSupported, requestBrowserNotificationPermission } from './browser-reminders'
import { formatReminderOffset, REMINDER_OFFSETS } from './reminder-types'

type HabitReminderSettingsProps = Readonly<{
  habit: Habit
  isBusy: boolean
  onSave: (habit: Habit, minutesBefore: number, isEnabled: boolean) => Promise<void>
}>

export function HabitReminderSettings({ habit, isBusy, onSave }: HabitReminderSettingsProps) {
  const schedule = habit.currentSchedule
  const reminder = habit.reminder
  const [offset, setOffset] = useState(reminder?.minutesBefore ?? 10)
  const [error, setError] = useState<string>()

  if (!schedule?.scheduledTime) {
    return (
      <section className="habit-reminder muted" aria-label={`Recordatorio de ${habit.name}`}>
        <strong>Recordatorio</strong>
        <span>Agrega una hora al hábito para poder recordarlo.</span>
      </section>
    )
  }

  const enabled = reminder?.isEnabled ?? false

  async function toggleReminder() {
    setError(undefined)
    try {
      if (!enabled) {
        const permission = await requestBrowserNotificationPermission()
        if (permission !== 'granted') {
          throw new Error(permission === 'unsupported'
            ? 'Este navegador no admite notificaciones.'
            : 'Las notificaciones están bloqueadas. Permítelas en la configuración del navegador.')
        }
      }
      await onSave(habit, offset, !enabled)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No pudimos guardar el recordatorio.')
    }
  }

  async function changeOffset(value: number) {
    const previousOffset = offset
    setOffset(value)
    if (!enabled) return
    setError(undefined)
    try {
      await onSave(habit, value, true)
    } catch (nextError) {
      setOffset(previousOffset)
      setError(nextError instanceof Error ? nextError.message : 'No pudimos guardar el recordatorio.')
    }
  }

  return (
    <section className="habit-reminder" aria-label={`Recordatorio de ${habit.name}`}>
      <div className="habit-reminder-heading">
        <div>
          <strong>Recordatorio</strong>
          <span>A las {schedule.scheduledTime} · solo mientras Kizen esté abierto</span>
        </div>
        <button
          aria-pressed={enabled}
          className={enabled ? 'text-action reminder-toggle enabled' : 'quiet-action reminder-toggle'}
          disabled={isBusy}
          type="button"
          onClick={() => { void toggleReminder() }}
        >
          {isBusy ? 'Guardando…' : enabled ? 'Activado' : 'Activar'}
        </button>
      </div>
      <label className="reminder-offset">
        <span>Recordar</span>
        <select
          aria-label={`Anticipación del recordatorio para ${habit.name}`}
          disabled={isBusy || !enabled}
          value={offset}
          onChange={(event) => { void changeOffset(Number(event.target.value)) }}
        >
          {REMINDER_OFFSETS.map((value) => (
            <option key={value} value={value}>{formatReminderOffset(value)}</option>
          ))}
        </select>
      </label>
      {!browserNotificationsSupported() && (
        <small className="reminder-note">Las notificaciones no están disponibles en este navegador.</small>
      )}
      {error && <small className="reminder-error" role="alert">{error}</small>}
    </section>
  )
}
