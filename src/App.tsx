import './App.css'
import { useState } from 'react'
import { AuthPanel } from './features/auth/AuthPanel'
import { useAuthSession } from './features/auth/use-auth-session'
import { getSupabaseClient } from './lib/supabase'

function App() {
  const [sessionMessage, setSessionMessage] = useState<string>()
  const [signOutError, setSignOutError] = useState<string>()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const {
    session,
    isLoading,
    isPasswordRecovery,
    initializationError,
    finishPasswordRecovery,
  } = useAuthSession()

  async function handleSignOut() {
    setIsSigningOut(true)
    setSignOutError(undefined)
    setSessionMessage(undefined)

    try {
      const { error } = await getSupabaseClient().auth.signOut({ scope: 'local' })
      if (error) throw error
    } catch {
      setSignOutError('No pudimos cerrar esta sesión. Inténtalo de nuevo.')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="brand">
        <span aria-hidden="true" className="brand-mark">K</span>
        <span>Kizen</span>
      </header>

      <div className="auth-layout">
        <section className="auth-intro" aria-labelledby="kizen-title">
          <p className="eyebrow">HÁBITOS CON INTENCIÓN</p>
          <h1 id="kizen-title">Una práctica a la vez.</h1>
          <p>
            Registra lo que haces, entiende tu constancia y continúa incluso cuando
            una racha se interrumpe.
          </p>
          <div className="promise-list" aria-label="Principios de Kizen">
            <span>Metas claras</span>
            <span>Progreso diario</span>
            <span>Datos privados</span>
          </div>
        </section>

        {isLoading && (
          <section className="state-card" aria-live="polite">Preparando tu espacio…</section>
        )}

        {!isLoading && initializationError && (
          <section className="state-card error-state" role="alert">{initializationError}</section>
        )}

        {!isLoading && !initializationError && isPasswordRecovery && (
          <AuthPanel
            recoveryMode
            onRecoveryComplete={(message) => {
              setSessionMessage(message)
              finishPasswordRecovery()
            }}
          />
        )}

        {!isLoading && !initializationError && !isPasswordRecovery && !session && <AuthPanel />}

        {!isLoading && !initializationError && !isPasswordRecovery && session && (
          <section className="state-card signed-in" aria-labelledby="session-title">
            <p className="eyebrow">SESIÓN ACTIVA</p>
            <h2 id="session-title">Tu espacio está listo.</h2>
            <p>Ingresaste como <strong>{session.user.email}</strong>.</p>
            <p>El dashboard de hábitos será el siguiente módulo del MVP.</p>
            {sessionMessage && <p className="session-message" role="status">{sessionMessage}</p>}
            {signOutError && <p className="session-message error" role="alert">{signOutError}</p>}
            <button
              className="secondary-action"
              disabled={isSigningOut}
              type="button"
              onClick={handleSignOut}
            >
              {isSigningOut ? 'Cerrando…' : 'Cerrar esta sesión'}
            </button>
          </section>
        )}
      </div>
    </main>
  )
}

export default App
