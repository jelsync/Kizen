import './App.css'
import { useState } from 'react'
import { AuthPanel } from './features/auth/AuthPanel'
import { useAuthSession } from './features/auth/use-auth-session'
import { HabitsPage } from './features/habits/HabitsPage'
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
  const showWorkspace = !isLoading
    && !initializationError
    && !isPasswordRecovery
    && Boolean(session)

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
    <main className={`app-shell${showWorkspace ? ' workspace-shell' : ''}`}>
      <header className={`brand${showWorkspace ? ' workspace-brand' : ''}`}>
        <div className="brand-identity">
          <span aria-hidden="true" className="brand-mark">K</span>
          <span>Kizen</span>
        </div>
        {showWorkspace && session && (
          <div className="account-actions">
            <span title={session.user.email}>{session.user.email}</span>
            <button
              className="secondary-action"
              disabled={isSigningOut}
              type="button"
              onClick={handleSignOut}
            >
              {isSigningOut ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
          </div>
        )}
      </header>

      {showWorkspace && session ? (
        <HabitsPage
          sessionMessage={sessionMessage}
          signOutError={signOutError}
          userId={session.user.id}
        />
      ) : (
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

        </div>
      )}
    </main>
  )
}

export default App
