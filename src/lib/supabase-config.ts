export type PublicSupabaseConfig = Readonly<{
  url: string
  anonKey: string
}>

export function resolvePublicSupabaseConfig(
  url: string | undefined,
  anonKey: string | undefined,
): PublicSupabaseConfig {
  const normalizedUrl = url?.trim()
  const normalizedAnonKey = anonKey?.trim()

  if (!normalizedUrl || !normalizedAnonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and set only public Supabase values.',
    )
  }

  return { url: normalizedUrl, anonKey: normalizedAnonKey }
}
