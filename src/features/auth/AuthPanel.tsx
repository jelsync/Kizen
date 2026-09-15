import { type FormEvent, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase'
import {
  normalizeEmail,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from './auth-validation'
import { buildAuthRedirect, buildPasswordRecoveryRedirect } from './auth-redirects'
import './AuthPanel.css'

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'update-password'

type AuthPanelProps = Readonly<{
  recoveryMode?: boolean
  onRecoveryComplete?: (message: string) => void
}>

const modeContent: Record<AuthMode, { title: string; description: string; submit: string }> = {
  'sign-in': {
    title: 'Bienvenido de vuelta',
    description: 'Continúa construyendo constancia, un día a la vez.',
    submit: 'Iniciar sesión',
  },
  'sign-up': {
    title: 'Crea tu espacio',
    description: 'Empieza con un hábito pequeño y haz visible tu progreso.',
    submit: 'Crear cuenta',
  },
  'forgot-password': {
    title: 'Recupera tu acceso',
    description: 'Te enviaremos un enlace seguro para cambiar tu contraseña.',
    submit: 'Enviar enlace',
  },
  'update-password': {
    title: 'Crea una nueva contraseña',
    description: 'Elige una contraseña que no utilices en otros servicios.',
    submit: 'Guardar contraseña',
  },
}

export function AuthPanel({ recoveryMode = false, onRecoveryComplete }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>(recoveryMode ? 'update-password' : 'sign-in')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [message, setMessage] = useState<string>()
  const [isError, setIsError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeMode = recoveryMode ? 'update-password' : mode
  const content = modeContent[activeMode]
  const messageId = 'auth-form-message'

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setMessage(undefined)
    setIsError(false)
    setPassword('')
    setPasswordConfirmation('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(undefined)
    setIsError(false)

    const needsEmail = activeMode !== 'update-password'
    const needsPassword = activeMode !== 'forgot-password'

    if (needsEmail) {
      const emailError = validateEmail(email)
      if (emailError) {
        setMessage(emailError)
        setIsError(true)
        return
      }
    }

    if (activeMode === 'sign-up') {
      const displayNameError = validateDisplayName(displayName)
      if (displayNameError) {
        setMessage(displayNameError)
        setIsError(true)
        return
      }
    }

    if (needsPassword) {
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.isValid) {
        setMessage(passwordValidation.message)
        setIsError(true)
        return
      }
    }

    if (
      (activeMode === 'sign-up' || activeMode === 'update-password')
      && password !== passwordConfirmation
    ) {
      setMessage('Las contraseñas no coinciden.')
      setIsError(true)
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = getSupabaseClient()
      const normalizedEmail = normalizeEmail(email)

      if (activeMode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })
        if (error) throw error
      }

      if (activeMode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: buildAuthRedirect(window.location.origin),
          },
        })
        if (error) throw error

        setMessage(
          data.session
            ? 'Tu cuenta está lista.'
            : 'Revisa tu correo para confirmar la cuenta y después inicia sesión.',
        )
      }

      if (activeMode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: buildPasswordRecoveryRedirect(window.location.origin),
        })
        if (error) throw error
        setMessage('Si existe una cuenta con ese correo, recibirás un enlace para recuperar el acceso.')
      }

      if (activeMode === 'update-password') {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        onRecoveryComplete?.('Tu contraseña fue actualizada correctamente.')
      }
    } catch {
      setIsError(true)
      setMessage(
        activeMode === 'sign-in'
          ? 'No pudimos iniciar sesión. Revisa tus datos e inténtalo de nuevo.'
          : 'No pudimos completar la solicitud. Inténtalo de nuevo en unos minutos.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-heading">
        <p className="eyebrow">TU PROGRESO, A SALVO</p>
        <h1 id="auth-title">{content.title}</h1>
        <p>{content.description}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {activeMode === 'sign-up' && (
          <label>
            Nombre
            <input
              aria-describedby={message ? messageId : undefined}
              aria-invalid={isError}
              autoComplete="name"
              maxLength={80}
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Cómo quieres que te llamemos"
            />
          </label>
        )}

        {activeMode !== 'update-password' && (
          <label>
            Correo electrónico
            <input
              aria-describedby={message ? messageId : undefined}
              aria-invalid={isError}
              autoComplete="email"
              inputMode="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
            />
          </label>
        )}

        {activeMode !== 'forgot-password' && (
          <label>
            {activeMode === 'update-password' ? 'Nueva contraseña' : 'Contraseña'}
            <input
              aria-describedby={message ? messageId : undefined}
              aria-invalid={isError}
              autoComplete={activeMode === 'sign-in' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </label>
        )}

        {(activeMode === 'sign-up' || activeMode === 'update-password') && (
          <label>
            Confirmar contraseña
            <input
              aria-describedby={message ? messageId : undefined}
              aria-invalid={isError}
              autoComplete="new-password"
              minLength={8}
              required
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              placeholder="Repite la contraseña"
            />
          </label>
        )}

        {message && (
          <p
            className={isError ? 'form-message error' : 'form-message'}
            id={messageId}
            role={isError ? 'alert' : 'status'}
          >
            {message}
          </p>
        )}

        <button className="primary-action" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Procesando…' : content.submit}
        </button>
      </form>

      {!recoveryMode && (
        <div className="auth-links">
          {activeMode === 'sign-in' && (
            <>
              <button type="button" onClick={() => changeMode('forgot-password')}>
                Olvidé mi contraseña
              </button>
              <p>
                ¿Aún no tienes cuenta?{' '}
                <button type="button" onClick={() => changeMode('sign-up')}>Crear cuenta</button>
              </p>
            </>
          )}
          {activeMode !== 'sign-in' && (
            <button type="button" onClick={() => changeMode('sign-in')}>
              Volver a iniciar sesión
            </button>
          )}
        </div>
      )}
    </section>
  )
}
