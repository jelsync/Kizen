import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { ISO_WEEKDAYS, type Habit } from './habit-types'
import { formatCivilDate } from './habit-dates'
import { getHabitDayProgress } from './habit-progress'

type HabitCardProps = Readonly<{
  habit: Habit
  isBusy: boolean
  isLogBusy: boolean
  localToday: string
  onEdit: (habit: Habit) => void
  onSaveDailyLog: (habit: Habit, amount: number) => Promise<void>
  onPause: (habit: Habit) => Promise<void>
  onReactivate: (habit: Habit) => void
  onArchive: (habit: Habit) => Promise<void>
  onDelete: (habit: Habit) => Promise<void>
}>

const statusLabels = {
  active: 'Activo',
  paused: 'En pausa',
  archived: 'Archivado',
} as const

function scheduleSummary(habit: Habit): string {
  const schedule = habit.currentSchedule ?? habit.latestSchedule
  if (!schedule) return 'Configura una nueva meta al reactivarlo'

  const unit = schedule.unit === 'minute' ? 'min' : schedule.unit
  return `${schedule.targetAmount} ${unit}`
}

function weekdaySummary(habit: Habit): string {
  const schedule = habit.currentSchedule ?? habit.latestSchedule
  if (!schedule) return 'Sin programación disponible'
  if (schedule.isoWeekdays.length === 7) return 'Todos los días'

  return schedule.isoWeekdays
    .map((value) => ISO_WEEKDAYS.find((day) => day.value === value)?.shortLabel)
    .filter(Boolean)
    .join(' · ')
}

export function HabitCard({
  habit,
  isBusy,
  isLogBusy,
  localToday,
  onEdit,
  onSaveDailyLog,
  onPause,
  onReactivate,
  onArchive,
  onDelete,
}: HabitCardProps) {
  const [confirmation, setConfirmation] = useState<'archive' | 'delete'>()
  const confirmationTitleId = useId()
  const cancelConfirmationRef = useRef<HTMLButtonElement>(null)
  const schedule = habit.currentSchedule ?? habit.latestSchedule
  const todayProgress = getHabitDayProgress(habit, localToday)
  const [amount, setAmount] = useState(todayProgress.log ? String(todayProgress.amount) : '')

  useEffect(() => {
    if (confirmation) cancelConfirmationRef.current?.focus()
  }, [confirmation])

  return (
    <li className={`habit-card ${habit.status}`}>
      <div className="habit-card-topline">
        <span className={`status-pill ${habit.status}`}>{statusLabels[habit.status]}</span>
        {habit.category && <span className="category-pill">{habit.category}</span>}
      </div>

      <div className="habit-card-content">
        <div>
          <h3>{habit.name}</h3>
          {habit.description && <p>{habit.description}</p>}
        </div>
        <strong className="target-value">{scheduleSummary(habit)}</strong>
      </div>

      <div className="schedule-row">
        <span>{weekdaySummary(habit)}</span>
        <span>{schedule?.scheduledTime ? `A las ${schedule.scheduledTime}` : 'Sin hora fija'}</span>
      </div>

      {habit.status === 'active' && (
        <div className="daily-progress">
          <div className="daily-progress-heading">
            <div>
              <strong>Progreso de hoy</strong>
              <span>{localToday}</span>
            </div>
            {todayProgress.schedule ? (
              <span className={`progress-status ${todayProgress.completed ? 'complete' : 'pending'}`}>
                {todayProgress.completed ? 'Completado' : 'Pendiente'}
              </span>
            ) : (
              <span className="progress-status muted">No programado</span>
            )}
          </div>

          {todayProgress.schedule ? (
            <form
              className="daily-progress-form"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                const parsedAmount = Number(amount)
                if (Number.isFinite(parsedAmount) && parsedAmount >= 0) {
                  void onSaveDailyLog(habit, parsedAmount)
                }
              }}
            >
              <label>
                <span className="sr-only">Cantidad lograda hoy</span>
                <input
                  aria-label={`Cantidad lograda hoy para ${habit.name}`}
                  disabled={isLogBusy || isBusy}
                  inputMode="decimal"
                  min="0"
                  required
                  step="0.01"
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <span>{todayProgress.schedule.unit === 'minute' ? 'min' : todayProgress.schedule.unit}</span>
              </label>
              <span className="progress-target">
                Meta: {todayProgress.schedule.targetAmount} {todayProgress.schedule.unit === 'minute' ? 'min' : todayProgress.schedule.unit}
              </span>
              <button className="text-action" disabled={isLogBusy || isBusy} type="submit">
                {isLogBusy ? 'Guardando…' : todayProgress.log ? 'Actualizar' : 'Registrar'}
              </button>
            </form>
          ) : (
            <p className="daily-progress-note">Este hábito descansa hoy.</p>
          )}
        </div>
      )}

      <div className="habit-history">
        <strong>Historial reciente</strong>
        {habit.logs.length === 0 ? (
          <p>Aún no hay registros diarios.</p>
        ) : (
          <ul>
            {habit.logs.slice(0, 7).map((log) => {
              const logSchedule = habit.schedules.find((entry) => entry.id === log.scheduleId)
              const completed = Boolean(logSchedule && log.amount >= logSchedule.targetAmount)
              const unit = logSchedule?.unit === 'minute' ? 'min' : logSchedule?.unit ?? ''
              return (
                <li key={log.id}>
                  <span>{formatCivilDate(log.logDate)}</span>
                  <span>{log.amount} {unit}</span>
                  <span className={completed ? 'history-complete' : 'history-pending'}>
                    {completed ? 'Completado' : 'Pendiente'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {confirmation ? (
        <div
          aria-labelledby={confirmationTitleId}
          className="delete-confirmation"
          role="alertdialog"
        >
          <strong id={confirmationTitleId}>
            {confirmation === 'archive' ? '¿Archivar este hábito?' : '¿Eliminarlo definitivamente?'}
          </strong>
          <p>
            {confirmation === 'archive'
              ? 'Conservarás el historial, pero un hábito archivado no puede reactivarse.'
              : 'Se eliminarán también toda la programación y el historial. Esta acción no se puede deshacer.'}
          </p>
          <div>
            <button
              className="quiet-action"
              disabled={isBusy}
              ref={cancelConfirmationRef}
              type="button"
              onClick={() => setConfirmation(undefined)}
            >
              Cancelar
            </button>
            <button
              className="danger-action"
              disabled={isBusy}
              type="button"
              onClick={() => confirmation === 'archive' ? onArchive(habit) : onDelete(habit)}
            >
              {isBusy
                ? 'Guardando…'
                : confirmation === 'archive' ? 'Sí, archivar' : 'Eliminar permanentemente'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card-actions">
          {habit.status === 'active' && (
            <>
              <button className="text-action" disabled={isBusy} type="button" onClick={() => onEdit(habit)}>
                Editar
              </button>
              <button className="text-action" disabled={isBusy} type="button" onClick={() => onPause(habit)}>
                {isBusy ? 'Guardando…' : 'Pausar'}
              </button>
            </>
          )}
          {habit.status === 'paused' && (
            <button className="text-action" disabled={isBusy} type="button" onClick={() => onReactivate(habit)}>
              Reactivar
            </button>
          )}
          {habit.status !== 'archived' && (
            <button className="text-action danger-text" disabled={isBusy} type="button" onClick={() => setConfirmation('archive')}>
              Archivar
            </button>
          )}
          {habit.status === 'archived' && (
            <button className="text-action danger-text" type="button" onClick={() => setConfirmation('delete')}>
              Eliminar permanentemente
            </button>
          )}
        </div>
      )}
    </li>
  )
}
