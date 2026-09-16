import type { Habit, HabitReminder } from '../habits/habit-types'

type ZonedMinute = Readonly<{ date: string; time: string }>

export function browserNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!browserNotificationsSupported()) return 'unsupported'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }
  return Notification.requestPermission()
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function addCivilDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`
}

export function getReminderTrigger(scheduleTime: string, minutesBefore: number, date: string): ZonedMinute {
  const [hours, minutes] = scheduleTime.slice(0, 5).split(':').map(Number)
  const total = hours * 60 + minutes - minutesBefore
  const dayOffset = Math.floor(total / 1440)
  const minuteOfDay = ((total % 1440) + 1440) % 1440
  return {
    date: addCivilDays(date, dayOffset),
    time: `${pad(Math.floor(minuteOfDay / 60))}:${pad(minuteOfDay % 60)}`,
  }
}

export function getZonedMinute(now: Date, timeZone: string): ZonedMinute {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return { date: `${read('year')}-${read('month')}-${read('day')}`, time: `${read('hour')}:${read('minute')}` }
}

function civilMinuteValue(value: ZonedMinute): number {
  return Date.parse(`${value.date}T${value.time}:00Z`) / 60_000
}

export function reminderStorageKey(reminder: HabitReminder, date: string): string {
  return `kizen:browser-reminder:${reminder.id}:${date}`
}

export function isHabitScheduledOnDate(habit: Habit, date: string): boolean {
  const schedule = habit.currentSchedule
  if (!schedule || schedule.effectiveFrom > date) return false
  if (schedule.effectiveUntil && date >= schedule.effectiveUntil) return false
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7
  return schedule.isoWeekdays.includes(weekday)
}

export function findDueReminder(
  habit: Habit,
  reminder: HabitReminder,
  now: Date,
  timeZone: string,
): { date: string; title: string; body: string } | null {
  if (!reminder.isEnabled || reminder.channel !== 'browser' || habit.status !== 'active') return null
  const schedule = habit.currentSchedule
  if (!schedule?.scheduledTime) return null
  const current = getZonedMinute(now, timeZone)
  const targetDates = [current.date, addCivilDays(current.date, 1)]
  const targetDate = targetDates.find((date) => {
    if (!isHabitScheduledOnDate(habit, date)) return false
    const trigger = getReminderTrigger(schedule.scheduledTime as string, reminder.minutesBefore, date)
    const elapsedMinutes = civilMinuteValue(current) - civilMinuteValue(trigger)
    return elapsedMinutes >= 0 && elapsedMinutes <= 2
  })
  if (!targetDate) return null
  return {
    date: current.date,
    title: `Kizen · ${habit.name}`,
    body: reminder.minutesBefore === 0
      ? `Es hora de ${habit.name}. Meta: ${schedule.targetAmount} ${schedule.unit === 'minute' ? 'min' : schedule.unit}.`
      : `${habit.name} comienza en ${reminder.minutesBefore} min. Meta: ${schedule.targetAmount} ${schedule.unit === 'minute' ? 'min' : schedule.unit}.`,
  }
}
