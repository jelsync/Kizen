import { describe, expect, it } from 'vitest'
import { findDueReminder, getReminderTrigger } from './browser-reminders'
import type { Habit, HabitReminder } from '../habits/habit-types'

const habit: Habit = {
  id: 'habit-1',
  name: 'Estudiar inglés',
  description: null,
  category: null,
  status: 'active',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  currentSchedule: {
    id: 'schedule-1',
    effectiveFrom: '2026-09-01',
    effectiveUntil: null,
    targetAmount: 60,
    measurementType: 'duration',
    unit: 'minute',
    scheduledTime: '07:00',
    isoWeekdays: [2],
  },
  latestSchedule: null,
  schedules: [],
  logs: [],
  reminder: {
    id: 'reminder-1',
    habitId: 'habit-1',
    channel: 'browser',
    minutesBefore: 10,
    isEnabled: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
}

describe('browser reminders', () => {
  it('handles a reminder that crosses midnight', () => {
    expect(getReminderTrigger('00:05', 10, '2026-09-15')).toEqual({
      date: '2026-09-14',
      time: '23:55',
    })
  })

  it('only returns a notification at the configured local minute', () => {
    const reminder = habit.reminder as HabitReminder
    expect(findDueReminder(habit, reminder, new Date('2026-09-15T12:50:00Z'), 'America/Tegucigalpa'))
      .toMatchObject({ date: '2026-09-15', title: 'Kizen · Estudiar inglés' })
    expect(findDueReminder(habit, reminder, new Date('2026-09-15T12:51:30Z'), 'America/Tegucigalpa'))
      .toMatchObject({ date: '2026-09-15' })
    expect(findDueReminder(habit, reminder, new Date('2026-09-15T12:53:00Z'), 'America/Tegucigalpa'))
      .toBeNull()
  })

  it('does not notify on an unscheduled weekday', () => {
    const reminder = habit.reminder as HabitReminder
    expect(findDueReminder(habit, reminder, new Date('2026-09-14T13:50:00Z'), 'America/Tegucigalpa'))
      .toBeNull()
  })

  it('notifies the previous evening for a shortly-after-midnight habit', () => {
    const midnightHabit: Habit = {
      ...habit,
      currentSchedule: { ...habit.currentSchedule!, scheduledTime: '00:05', isoWeekdays: [2] },
    }
    const reminder = habit.reminder as HabitReminder
    expect(findDueReminder(midnightHabit, reminder, new Date('2026-09-15T05:55:00Z'), 'America/Tegucigalpa'))
      .toMatchObject({ date: '2026-09-14' })
  })
})
