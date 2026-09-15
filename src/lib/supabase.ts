import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { resolvePublicSupabaseConfig } from './supabase-config'

let client: SupabaseClient | undefined

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const config = resolvePublicSupabaseConfig(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )

    client = createClient(config.url, config.anonKey)
  }

  return client
}
