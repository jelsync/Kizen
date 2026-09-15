import { describe, expect, it } from 'vitest'
import {
  normalizeEmail,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from './auth-validation'

describe('auth validation', () => {
  it('normalizes an email before sending it to Supabase', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com')
  })

  it('rejects malformed email addresses', () => {
    expect(validateEmail('not-an-email')).toBeDefined()
    expect(validateEmail('user@example.com')).toBeUndefined()
  })

  it('requires a display name and respects the database limit', () => {
    expect(validateDisplayName('   ')).toBeDefined()
    expect(validateDisplayName('A'.repeat(81))).toBeDefined()
    expect(validateDisplayName('Jelsy')).toBeUndefined()
  })

  it('uses the same minimum password policy as local Supabase', () => {
    expect(validatePassword('short1A').isValid).toBe(false)
    expect(validatePassword('onlyletters').isValid).toBe(false)
    expect(validatePassword('StrongPass1').isValid).toBe(true)
  })
})
