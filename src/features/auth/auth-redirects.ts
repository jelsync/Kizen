const RECOVERY_QUERY_PARAMETER = 'recovery'

export function buildAuthRedirect(origin: string): string {
  return new URL('/', origin).toString()
}

export function buildPasswordRecoveryRedirect(origin: string): string {
  const url = new URL('/', origin)
  url.searchParams.set(RECOVERY_QUERY_PARAMETER, '1')
  return url.toString()
}

export function hasPasswordRecoveryIntent(search: string): boolean {
  return new URLSearchParams(search).get(RECOVERY_QUERY_PARAMETER) === '1'
}

export function clearPasswordRecoveryUrl(href: string): string {
  const url = new URL(href)
  url.searchParams.delete(RECOVERY_QUERY_PARAMETER)
  url.searchParams.delete('code')
  url.searchParams.delete('token_hash')
  url.searchParams.delete('type')

  return `${url.pathname}${url.search}`
}
