import { useCallback, useEffect, useMemo, useState } from 'react'
import { HabitCard } from './HabitCard'
import { HabitForm } from './HabitForm'
import { habitToFormValues, hasScheduleChanged } from './habit-mappers'
import {
  createHabit,
  deleteHabitPermanently,
  loadHabitWorkspace,
  setHabitStatus,
  setDailyLog,
  updateHabit,
  type HabitWorkspace,
} from './habits-repository'
import { saveBrowserReminder } from '../reminders/reminders-repository'
import { useBrowserReminders } from '../reminders/use-browser-reminders'
import {
  EMPTY_HABIT_FORM,
  type Habit,
  type HabitFilter,
  type HabitInput,
} from './habit-types'
import { formatDateInTimeZone } from './habit-dates'
import './HabitsPage.css'

type EditorState = Readonly<{
  mode: 'create' | 'edit' | 'reactivate'
  habit?: Habit
}>

type HabitsPageProps = Readonly<{
  userId: string
  sessionMessage?: string
  signOutError?: string
}>

const filters: ReadonlyArray<{ value: HabitFilter; label: string }> = [
  { value: 'active', label: 'Activos' },
  { value: 'paused', label: 'En pausa' },
  { value: 'archived', label: 'Archivados' },
]

export function HabitsPage({ userId, sessionMessage, signOutError }: HabitsPageProps) {
  const [workspace, setWorkspace] = useState<HabitWorkspace>()
  const [filter, setFilter] = useState<HabitFilter>('active')
  const [editor, setEditor] = useState<EditorState>()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string>()
  const [actionError, setActionError] = useState<string>()
  const [successMessage, setSuccessMessage] = useState<string>()
  const [busyHabitId, setBusyHabitId] = useState<string>()
  const [busyLogHabitId, setBusyLogHabitId] = useState<string>()
  const [busyReminderHabitId, setBusyReminderHabitId] = useState<string>()
  const [currentTime, setCurrentTime] = useState(() => new Date())

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true)
    setLoadError(undefined)

    try {
      setWorkspace(await loadHabitWorkspace(userId))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No pudimos cargar tus hábitos.')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let isActive = true

    void loadHabitWorkspace(userId)
      .then((nextWorkspace) => {
        if (isActive) setWorkspace(nextWorkspace)
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadError(error instanceof Error ? error.message : 'No pudimos cargar tus hábitos.')
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [userId])

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const localToday = workspace
    ? formatDateInTimeZone(currentTime, workspace.timeZone)
    : undefined

  useBrowserReminders({
    habits: workspace?.habits ?? [],
    timeZone: workspace?.timeZone ?? 'UTC',
  })

  const visibleHabits = useMemo(
    () => workspace?.habits.filter((habit) => habit.status === filter) ?? [],
    [filter, workspace],
  )

  const counts = useMemo(() => Object.fromEntries(
    filters.map(({ value }) => [
      value,
      workspace?.habits.filter((habit) => habit.status === value).length ?? 0,
    ]),
  ) as Record<HabitFilter, number>, [workspace])

  function resetFeedback() {
    setActionError(undefined)
    setSuccessMessage(undefined)
  }

  async function handleSave(input: HabitInput) {
    if (!workspace) throw new Error('Espera a que termine de cargar tu espacio.')
    const mutationDate = formatDateInTimeZone(new Date(), workspace.timeZone)
    resetFeedback()

    if (editor?.mode === 'create') {
      await createHabit(input, mutationDate)
      setSuccessMessage('Hábito creado. Ya forma parte de tu semana.')
    } else if (editor?.habit) {
      const scheduleMustChange = editor.mode === 'reactivate'
        || hasScheduleChanged(editor.habit, input)
      await updateHabit(editor.habit.id, input, scheduleMustChange, mutationDate)
      setSuccessMessage(editor.mode === 'reactivate'
        ? 'Hábito reactivado con una nueva programación.'
        : 'Cambios guardados correctamente.')
    }

    await refresh()
    setEditor(undefined)
    setFilter('active')
  }

  async function changeStatus(habit: Habit, status: 'paused' | 'archived') {
    if (!workspace) return
    resetFeedback()
    setBusyHabitId(habit.id)
    try {
      const mutationDate = formatDateInTimeZone(new Date(), workspace.timeZone)
      await setHabitStatus(habit.id, status, mutationDate)
      await refresh()
      setSuccessMessage(status === 'paused'
        ? 'Hábito pausado. Su historial permanece intacto.'
        : 'Hábito archivado. Puedes eliminarlo permanentemente desde Archivados.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No pudimos cambiar el estado.')
    } finally {
      setBusyHabitId(undefined)
    }
  }

  async function handleDelete(habit: Habit) {
    resetFeedback()
    setBusyHabitId(habit.id)
    try {
      await deleteHabitPermanently(habit.id)
      await refresh()
      setSuccessMessage('El hábito y su historial fueron eliminados permanentemente.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No pudimos eliminar el hábito.')
    } finally {
      setBusyHabitId(undefined)
    }
  }

  async function handleSaveDailyLog(habit: Habit, amount: number) {
    if (!workspace || !localToday) return
    resetFeedback()
    setBusyLogHabitId(habit.id)
    try {
      await setDailyLog(habit.id, localToday, amount)
      await refresh()
      setSuccessMessage('Progreso diario guardado.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No pudimos guardar el progreso.')
    } finally {
      setBusyLogHabitId(undefined)
    }
  }

  async function handleSaveReminder(habit: Habit, minutesBefore: number, isEnabled: boolean) {
    if (!workspace) return
    resetFeedback()
    setBusyReminderHabitId(habit.id)
    try {
      const reminder = await saveBrowserReminder({
        habitId: habit.id,
        userId,
        minutesBefore,
        isEnabled,
      })
      setWorkspace((current) => current
        ? { ...current, habits: current.habits.map((entry) => entry.id === habit.id
          ? { ...entry, reminder }
          : entry) }
        : current)
      setSuccessMessage(isEnabled ? 'Recordatorio activado.' : 'Recordatorio pausado.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No pudimos guardar el recordatorio.')
    } finally {
      setBusyReminderHabitId(undefined)
    }
  }

  if (editor) {
    return (
      <HabitForm
        key={`${editor.mode}-${editor.habit?.id ?? 'new'}`}
        initialValues={editor.habit ? habitToFormValues(editor.habit) : EMPTY_HABIT_FORM}
        isEditing={editor.mode !== 'create'}
        isReactivating={editor.mode === 'reactivate'}
        onCancel={() => setEditor(undefined)}
        onSave={handleSave}
      />
    )
  }

  return (
    <section className="habits-workspace" aria-labelledby="habits-title">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">TU SISTEMA PERSONAL</p>
          <h1 id="habits-title">Hábitos</h1>
          <p>Diseña una semana que puedas sostener.</p>
        </div>
        <button className="primary-action create-action" type="button" onClick={() => {
          resetFeedback()
          setEditor({ mode: 'create' })
        }}>
          <span aria-hidden="true">＋</span> Crear hábito
        </button>
      </div>

      <div className="workspace-meta">
        <span>Hoy: {localToday ?? '—'}</span>
        <span>Zona horaria: {workspace?.timeZone ?? 'cargando…'}</span>
      </div>

      {(sessionMessage || successMessage) && (
        <p className="workspace-message" role="status">{successMessage ?? sessionMessage}</p>
      )}
      {(signOutError || actionError) && (
        <p className="workspace-message error" role="alert">{actionError ?? signOutError}</p>
      )}

      <nav className="habit-filters" aria-label="Filtrar hábitos por estado">
        {filters.map(({ value, label }) => (
          <button
            aria-current={filter === value ? 'page' : undefined}
            className={filter === value ? 'active' : undefined}
            key={value}
            type="button"
            onClick={() => setFilter(value)}
          >
            {label} <span>{counts[value]}</span>
          </button>
        ))}
      </nav>

      {isLoading && <div className="workspace-state" aria-live="polite">Cargando tus hábitos…</div>}

      {!isLoading && loadError && (
        <div className="workspace-state error-state" role="alert">
          <p>{loadError}</p>
          <button className="quiet-action" type="button" onClick={() => refresh(true)}>Reintentar</button>
        </div>
      )}

      {!isLoading && !loadError && visibleHabits.length === 0 && (
        <div className="workspace-state empty-state">
          <span aria-hidden="true">{filter === 'active' ? '◌' : '○'}</span>
          <h2>{filter === 'active' ? 'Empieza con algo pequeño' : `No tienes hábitos ${filter === 'paused' ? 'en pausa' : 'archivados'}`}</h2>
          <p>
            {filter === 'active'
              ? 'Elige una práctica clara, una meta realista y los días en que quieres realizarla.'
              : 'Los hábitos que cambien a este estado aparecerán aquí.'}
          </p>
          {filter === 'active' && (
            <button className="primary-action" type="button" onClick={() => setEditor({ mode: 'create' })}>
              Crear mi primer hábito
            </button>
          )}
        </div>
      )}

      {!isLoading && !loadError && visibleHabits.length > 0 && (
        <ul className="habit-list">
          {visibleHabits.map((habit) => (
              <HabitCard
              habit={habit}
              isBusy={busyHabitId === habit.id}
                isLogBusy={busyLogHabitId === habit.id}
                isReminderBusy={busyReminderHabitId === habit.id}
              key={`${habit.id}-${localToday}-${habit.logs.find((log) => log.logDate === localToday)?.amount ?? 'empty'}-${habit.reminder?.updatedAt ?? 'no-reminder'}`}
              localToday={localToday ?? ''}
              onArchive={(selected) => changeStatus(selected, 'archived')}
              onDelete={handleDelete}
              onEdit={(selected) => {
                resetFeedback()
                setEditor({ mode: 'edit', habit: selected })
              }}
              onPause={(selected) => changeStatus(selected, 'paused')}
              onSaveDailyLog={handleSaveDailyLog}
              onSaveReminder={handleSaveReminder}
              onReactivate={(selected) => {
                resetFeedback()
                setEditor({ mode: 'reactivate', habit: selected })
              }}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
