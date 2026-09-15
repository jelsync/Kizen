import { type FormEvent, useEffect, useRef, useState } from 'react'
import {
  ISO_WEEKDAYS,
  type HabitFormValues,
  type HabitInput,
  type MeasurementType,
} from './habit-types'
import { toHabitInput, validateHabit, type HabitFormErrors } from './habit-validation'

type HabitFormProps = Readonly<{
  initialValues: HabitFormValues
  isEditing: boolean
  isReactivating?: boolean
  onCancel: () => void
  onSave: (input: HabitInput) => Promise<void>
}>

export function HabitForm({
  initialValues,
  isEditing,
  isReactivating = false,
  onCancel,
  onSave,
}: HabitFormProps) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<HabitFormErrors>({})
  const [submitError, setSubmitError] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  function updateValue<Field extends keyof HabitFormValues>(
    field: Field,
    value: HabitFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function selectMeasurementType(measurementType: MeasurementType) {
    updateValue('measurementType', measurementType)
    if (measurementType === 'duration') updateValue('unit', 'minute')
    else if (values.measurementType === 'duration') updateValue('unit', '')
  }

  function toggleWeekday(day: number) {
    const selected = values.isoWeekdays.includes(day)
    updateValue(
      'isoWeekdays',
      selected
        ? values.isoWeekdays.filter((weekday) => weekday !== day)
        : [...values.isoWeekdays, day].sort((left, right) => left - right),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(undefined)
    const nextErrors = validateHabit(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('.habit-form [aria-invalid="true"]')?.focus()
      })
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(toHabitInput(values))
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No pudimos guardar el hábito.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function fieldDescription(field: keyof HabitFormValues): string | undefined {
    return errors[field] ? `${String(field)}-error` : undefined
  }

  return (
    <section className="habit-editor" aria-labelledby="habit-form-title">
      <div className="editor-heading">
        <div>
          <p className="eyebrow">{isReactivating ? 'VOLVER A EMPEZAR' : 'CONFIGURACIÓN'}</p>
          <h2 id="habit-form-title" ref={titleRef} tabIndex={-1}>
            {isReactivating ? 'Reactiva tu hábito' : isEditing ? 'Edita tu hábito' : 'Crea un hábito'}
          </h2>
        </div>
        <button className="quiet-action" type="button" onClick={onCancel}>Volver</button>
      </div>

      <form className="habit-form" onSubmit={handleSubmit} noValidate>
        <div className="form-section">
          <div className="section-heading">
            <span>01</span>
            <div>
              <h3>Identidad</h3>
              <p>Hazlo concreto y fácil de reconocer.</p>
            </div>
          </div>

          <label>
            Nombre
            <input
              aria-describedby={fieldDescription('name')}
              aria-invalid={Boolean(errors.name)}
              autoFocus
              maxLength={120}
              value={values.name}
              onChange={(event) => updateValue('name', event.target.value)}
              placeholder="Ej. Estudiar inglés"
            />
            {errors.name && <span className="field-error" id="name-error">{errors.name}</span>}
          </label>

          <div className="form-grid two-columns">
            <label>
              Categoría <span className="optional">Opcional</span>
              <input
                aria-describedby={fieldDescription('category')}
                aria-invalid={Boolean(errors.category)}
                maxLength={60}
                value={values.category}
                onChange={(event) => updateValue('category', event.target.value)}
                placeholder="Aprendizaje, salud…"
              />
              {errors.category && (
                <span className="field-error" id="category-error">{errors.category}</span>
              )}
            </label>

            <label>
              Hora <span className="optional">Opcional</span>
              <input
                aria-describedby={fieldDescription('scheduledTime')}
                aria-invalid={Boolean(errors.scheduledTime)}
                type="time"
                value={values.scheduledTime}
                onChange={(event) => updateValue('scheduledTime', event.target.value)}
              />
              {errors.scheduledTime && (
                <span className="field-error" id="scheduledTime-error">{errors.scheduledTime}</span>
              )}
            </label>
          </div>

          <label>
            Descripción <span className="optional">Opcional</span>
            <textarea
              aria-describedby={fieldDescription('description')}
              aria-invalid={Boolean(errors.description)}
              maxLength={1000}
              rows={3}
              value={values.description}
              onChange={(event) => updateValue('description', event.target.value)}
              placeholder="Qué quieres conseguir con este hábito"
            />
            {errors.description && (
              <span className="field-error" id="description-error">{errors.description}</span>
            )}
          </label>
        </div>

        <div className="form-section">
          <div className="section-heading">
            <span>02</span>
            <div>
              <h3>Meta</h3>
              <p>Define cuánto cuenta como un día cumplido.</p>
            </div>
          </div>

          <label>
            Cómo medirás el progreso
            <select
              value={values.measurementType}
              onChange={(event) => selectMeasurementType(event.target.value as MeasurementType)}
            >
              <option value="duration">Duración</option>
              <option value="count">Cantidad</option>
              <option value="custom">Unidad personalizada</option>
            </select>
          </label>

          <div className="form-grid target-grid">
            <label>
              Meta diaria
              <input
                aria-describedby={fieldDescription('targetAmount')}
                aria-invalid={Boolean(errors.targetAmount)}
                inputMode="decimal"
                min="0.01"
                step="0.01"
                type="number"
                value={values.targetAmount}
                onChange={(event) => updateValue('targetAmount', event.target.value)}
              />
              {errors.targetAmount && (
                <span className="field-error" id="targetAmount-error">{errors.targetAmount}</span>
              )}
            </label>

            <label>
              Unidad
              <input
                aria-describedby={fieldDescription('unit')}
                aria-invalid={Boolean(errors.unit)}
                disabled={values.measurementType === 'duration'}
                maxLength={32}
                value={values.measurementType === 'duration' ? 'minutos' : values.unit}
                onChange={(event) => updateValue('unit', event.target.value)}
                placeholder="páginas, repeticiones…"
              />
              {errors.unit && <span className="field-error" id="unit-error">{errors.unit}</span>}
            </label>
          </div>
        </div>

        <fieldset
          aria-describedby={fieldDescription('isoWeekdays')}
          aria-invalid={Boolean(errors.isoWeekdays)}
          className="form-section weekday-section"
          tabIndex={errors.isoWeekdays ? -1 : undefined}
        >
          <legend className="section-heading">
            <span>03</span>
            <span>
              <strong>Días</strong>
              <small>Elige cuándo forma parte de tu semana.</small>
            </span>
          </legend>

          <div className="weekday-toolbar">
            <span>{values.isoWeekdays.length} de 7 seleccionados</span>
            <button
              className="text-action"
              type="button"
              onClick={() => updateValue('isoWeekdays', [1, 2, 3, 4, 5, 6, 7])}
            >
              Todos los días
            </button>
          </div>

          <div className="weekday-picker">
            {ISO_WEEKDAYS.map((day) => (
              <label className="weekday-option" key={day.value}>
                <input
                  checked={values.isoWeekdays.includes(day.value)}
                  type="checkbox"
                  onChange={() => toggleWeekday(day.value)}
                />
                <span aria-hidden="true">{day.shortLabel}</span>
                <small>{day.label}</small>
              </label>
            ))}
          </div>
          {errors.isoWeekdays && (
            <span className="field-error" id="isoWeekdays-error">{errors.isoWeekdays}</span>
          )}
        </fieldset>

        {submitError && <p className="editor-message error" role="alert">{submitError}</p>}

        <div className="editor-actions">
          <button className="quiet-action" disabled={isSubmitting} type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary-action" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? 'Guardando…'
              : isReactivating
                ? 'Reactivar y guardar'
                : isEditing ? 'Guardar cambios' : 'Crear hábito'}
          </button>
        </div>
      </form>
    </section>
  )
}
