import { describe, expect, it } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import {
  initialAuthSessionState,
  reduceAuthSession,
} from './auth-session-state'

const session = { user: { email: 'user@kizen.test' } } as Session

describe('auth session state', () => {
  it('loads a persisted initial session', () => {
    const state = reduceAuthSession(initialAuthSessionState, {
      type: 'SESSION_LOADED',
      session,
    })

    expect(state.session).toBe(session)
    expect(state.isLoading).toBe(false)
  })

  it('enters password recovery and leaves it after updating the user', () => {
    const recovery = reduceAuthSession(initialAuthSessionState, {
      type: 'AUTH_EVENT',
      event: 'PASSWORD_RECOVERY',
      session,
    })
    const updated = reduceAuthSession(recovery, {
      type: 'AUTH_EVENT',
      event: 'USER_UPDATED',
      session,
    })

    expect(recovery.isPasswordRecovery).toBe(true)
    expect(updated.isPasswordRecovery).toBe(false)
  })

  it('clears the session and recovery state after signing out', () => {
    const state = reduceAuthSession(
      { ...initialAuthSessionState, session, isPasswordRecovery: true },
      { type: 'AUTH_EVENT', event: 'SIGNED_OUT', session: null },
    )

    expect(state.session).toBeNull()
    expect(state.isPasswordRecovery).toBe(false)
  })

  it('surfaces an initial session failure', () => {
    const state = reduceAuthSession(initialAuthSessionState, { type: 'SESSION_FAILED' })

    expect(state.isLoading).toBe(false)
    expect(state.sessionError).toBeDefined()
  })
})
