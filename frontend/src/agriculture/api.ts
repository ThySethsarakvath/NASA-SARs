const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim() || 'https://sarwatch-backend-production.up.railway.app'
export function apiUrl(path: string): string {
  const base = new URL(configuredBase)
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname))) throw new Error('The agriculture API requires HTTPS.')
  if (base.username || base.password || base.search || base.hash) throw new Error('Invalid agriculture API configuration.')
  return `${base.href.replace(/\/$/, '')}${path}`
}
export async function request<T>(path: string, parse: (value: unknown) => T, signal: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(20000)
  try {
    const response = await fetch(apiUrl(path), { signal: AbortSignal.any([signal, timeout]), credentials: 'omit' })
    if (!response.ok) throw new Error(response.status === 503 ? 'This dataset is not available from the API yet.' : `The agriculture API returned HTTP ${response.status}.`)
    return parse(await response.json() as unknown)
  } catch (error) {
    if (signal.aborted) throw error
    if (timeout.aborted) throw new Error('The agriculture API took too long. Please try again.', { cause: error })
    if (error instanceof TypeError) throw new Error('Cannot reach the agriculture API. Check your connection and try again.', { cause: error })
    throw error
  }
}
