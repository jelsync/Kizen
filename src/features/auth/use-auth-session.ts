import { useEffect, useReducer, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../lib/supabase'
import { initialAuthSessionState, reduceAuthSession } from './auth-session-state'
import { clearPasswordRecoveryUrl, hasPasswordRecoveryIntent } from './auth-redirects'

type ClientInitialization = Readonly<{
  client?: SupabaseClient
  error?: string
}>

function initializeClient(): ClientInitialization {
  try {
    return { client: getSupabaseClient() }
  } catch {
    return {
      error: 'No se pudo iniciar la conexión segura con Supabase. Revisa la configuración local.',
    }
  }
}

export function useAuthSession() {
  const [initialization] = useState(initializeClient)
  const recoveryIntent = typeof window !== 'undefined'
    && hasPasswordRecoveryIntent(window.location.search)
  const [state, dispatch] = useReducer(
    reduceAuthSession,
    initialization.error
      ? { ...initialAuthSessionState, isLoading: false, isPasswordRecovery: recoveryIntent }
      : { ...initialAuthSessionState, isPasswordRecovery: recoveryIntent },
  )

  useEffect(() => {
    if (!initialization.client) return undefined

    let isActive = true
    const { data } = initialization.client.auth.onAuthStateChange((event, nextSession) => {
      if (!isActive) return

      dispatch({ type: 'AUTH_EVENT', event, session: nextSession })
    })

    void initialization.client.auth.getSession()
      .then(({ data: sessionData, error }) => {
        if (!isActive) return
        dispatch(error
          ? { type: 'SESSION_FAILED' }
          : { type: 'SESSION_LOADED', session: sessionData.session })
      })
      .catch(() => {
        if (isActive) dispatch({ type: 'SESSION_FAILED' })
      })

    return () => {
      isActive = false
      data.subscription.unsubscribe()
    }
  }, [initialization])

  function finishPasswordRecovery() {
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', clearPasswordRecoveryUrl(window.location.href))
    }
    dispatch({ type: 'RECOVERY_FINISHED' })
  }

  return {
    session: state.session,
    isLoading: state.isLoading,
    isPasswordRecovery: state.isPasswordRecovery,
    initializationError: initialization.error ?? state.sessionError,
    finishPasswordRecovery,
  }
}
