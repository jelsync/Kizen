import { describe, expect, it } from 'vitest'
import {
  buildAuthRedirect,
  buildPasswordRecoveryRedirect,
  clearPasswordRecoveryUrl,
  hasPasswordRecoveryIntent,
} from './auth-redirects'

describe('auth redirects', () => {
  it('builds a regular callback at the application root', () => {
    expect(buildAuthRedirect('http://localhost:5173')).toBe('http://localhost:5173/')
  })

  it('marks password recovery callbacks so a refresh keeps the recovery form', () => {
    const redirect = buildPasswordRecoveryRedirect('http://localhost:5173')

    expect(redirect).toBe('http://localhost:5173/?recovery=1')
    expect(hasPasswordRecoveryIntent(new URL(redirect).search)).toBe(true)
  })

  it('removes recovery parameters and fragments after the password changes', () => {
    expect(
      clearPasswordRecoveryUrl('http://localhost:5173/?recovery=1&tab=today#access_token=secret'),
    ).toBe('/?tab=today')
  })
})
