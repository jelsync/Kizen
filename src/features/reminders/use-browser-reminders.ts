import { useEffect } from 'react'
import type { Habit } from '../habits/habit-types'
import { findDueReminder, reminderStorageKey } from './browser-reminders'

type BrowserRemindersProps = Readonly<{
  habits: Habit[]
  timeZone: string
}>

export function useBrowserReminders({ habits, timeZone }: BrowserRemindersProps): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return

    const check = () => {
      const now = new Date()
      habits.forEach((habit) => {
        const reminder = habit.reminder
        if (!reminder) return
        const due = findDueReminder(habit, reminder, now, timeZone)
        if (!due) return
        const key = reminderStorageKey(reminder, due.date)
        try {
          if (window.localStorage.getItem(key)) return
          window.localStorage.setItem(key, '1')
          new Notification(due.title, { body: due.body, tag: key })
        } catch {
          // Storage and notification permissions can change while the tab is open.
          // A failed delivery must not stop checks for the remaining habits.
        }
      })
    }

    check()
    const intervalId = window.setInterval(check, 30_000)
    return () => window.clearInterval(intervalId)
  }, [habits, timeZone])
}
