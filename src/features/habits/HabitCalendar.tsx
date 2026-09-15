import { useMemo, useState } from 'react'
import {
  buildHabitCalendar,
  formatCalendarMonth,
  shiftCalendarMonth,
  type HabitCalendarDay,
} from './habit-calendar'
import { formatCivilDate } from './habit-dates'
import type { Habit } from './habit-types'

type HabitCalendarProps = Readonly<{
  habit: Habit
  today: string
}>

const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const kindLabels = {
  completed: 'Completado',
  missed: 'Incumplido',
  scheduled: 'Programado',
  unscheduled: 'No programado',
} as const

function dayLabel(day: HabitCalendarDay): string {
  if (day.isOutsideMonth) return formatCivilDate(day.date)
  const status = kindLabels[day.kind]
  const today = day.isToday ? ' · Hoy' : ''
  const amount = day.log ? ` · ${day.amount} registrado` : ''
  return `${formatCivilDate(day.date)} · ${status}${today}${amount}`
}

export function HabitCalendar({ habit, today }: HabitCalendarProps) {
  const [month, setMonth] = useState(() => today.slice(0, 7))
  const calendar = useMemo(
    () => buildHabitCalendar(habit, month, today),
    [habit, month, today],
  )

  return (
    <section className="habit-calendar" aria-labelledby={`calendar-${habit.id}`}>
      <div className="habit-calendar-heading">
        <strong id={`calendar-${habit.id}`}>Calendario</strong>
        <div className="calendar-navigation">
          <button
            aria-label="Mes anterior"
            className="calendar-nav-action"
            type="button"
            onClick={() => setMonth((current) => shiftCalendarMonth(current, -1))}
          >
            ←
          </button>
          <span aria-live="polite">{formatCalendarMonth(calendar.month)}</span>
          <button
            aria-label="Mes siguiente"
            className="calendar-nav-action"
            type="button"
            onClick={() => setMonth((current) => shiftCalendarMonth(current, 1))}
          >
            →
          </button>
        </div>
      </div>

      <div aria-label={`Calendario de ${habit.name}`} className="calendar-grid" role="grid">
        {weekdays.map((weekday) => (
          <div className="calendar-weekday" key={weekday} role="columnheader">{weekday}</div>
        ))}
        {calendar.days.map((day) => (
          <div
            aria-label={dayLabel(day)}
            className={[
              'calendar-day',
              `calendar-day-${day.kind}`,
              day.isOutsideMonth ? 'calendar-day-outside' : '',
              day.isToday ? 'calendar-day-today' : '',
            ].filter(Boolean).join(' ')}
            key={day.date}
            role="gridcell"
          >
            <span aria-hidden="true">{day.dayOfMonth}</span>
            {!day.isOutsideMonth && day.isToday && <span className="sr-only">Hoy</span>}
          </div>
        ))}
      </div>

      <div aria-label="Leyenda del calendario" className="calendar-legend">
        {Object.entries(kindLabels).map(([kind, label]) => (
          <span key={kind}>
            <i aria-hidden="true" className={`calendar-key calendar-key-${kind}`} />
            {label}
          </span>
        ))}
        <span>
          <i aria-hidden="true" className="calendar-key calendar-key-today" />
          Hoy
        </span>
      </div>
    </section>
  )
}
