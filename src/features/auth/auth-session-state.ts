import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export type AuthSessionState = Readonly<{
  session: Session | null
  isLoading: boolean
  isPasswordRecovery: boolean
  sessionError?: string
}>

export type AuthSessionAction =
  | Readonly<{ type: 'AUTH_EVENT'; event: AuthChangeEvent; session: Session | null }>
  | Readonly<{ type: 'SESSION_LOADED'; session: Session | null }>
  | Readonly<{ type: 'SESSION_FAILED' }>
  | Readonly<{ type: 'RECOVERY_FINISHED' }>

export const initialAuthSessionState: AuthSessionState = {
  session: null,
  isLoading: true,
  isPasswordRecovery: false,
}

export function reduceAuthSession(
  state: AuthSessionState,
  action: AuthSessionAction,
): AuthSessionState {
  if (action.type === 'SESSION_LOADED') {
    return { ...state, session: action.session, isLoading: false, sessionError: undefined }
  }

  if (action.type === 'SESSION_FAILED') {
    return {
      ...state,
      session: null,
      isLoading: false,
      sessionError: 'No pudimos recuperar tu sesión. Recarga la página para intentarlo de nuevo.',
    }
  }

  if (action.type === 'RECOVERY_FINISHED') {
    return { ...state, isPasswordRecovery: false }
  }

  return {
    session: action.session,
    isLoading: false,
    isPasswordRecovery: action.event === 'PASSWORD_RECOVERY'
      ? true
      : action.event === 'USER_UPDATED' || action.event === 'SIGNED_OUT'
        ? false
        : state.isPasswordRecovery,
    sessionError: undefined,
  }
}
