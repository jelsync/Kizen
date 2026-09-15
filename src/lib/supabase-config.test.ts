import { describe, expect, it } from 'vitest'
import { resolvePublicSupabaseConfig } from './supabase-config'

describe('resolvePublicSupabaseConfig', () => {
  it('normalizes public Supabase values', () => {
    expect(resolvePublicSupabaseConfig(' https://project.supabase.co ', ' public-key ')).toEqual({
      url: 'https://project.supabase.co',
      anonKey: 'public-key',
    })
  })

  it('rejects an incomplete public configuration', () => {
    expect(() => resolvePublicSupabaseConfig(undefined, 'public-key')).toThrow(
      'Missing VITE_SUPABASE_URL',
    )
  })
})
