import { useEffect, useId, useRef, useState } from 'react'
import { ISO_WEEKDAYS, type Habit } from './habit-types'

type HabitCardProps = Readonly<{
  habit: Habit
  isBusy: boolean
  onEdit: (habit: Habit) => void
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
  onEdit,
  onPause,
  onReactivate,
  onArchive,
  onDelete,
}: HabitCardProps) {
  const [confirmation, setConfirmation] = useState<'archive' | 'delete'>()
  const confirmationTitleId = useId()
  const cancelConfirmationRef = useRef<HTMLButtonElement>(null)
  const schedule = habit.currentSchedule ?? habit.latestSchedule

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
