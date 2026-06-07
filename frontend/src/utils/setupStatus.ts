const SETUP_CACHE_KEY = 'setup_status_v1'
const SETUP_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export interface SetupCache {
  needsSetup: boolean
  checkedAt: number
}

export function getCachedSetup(): SetupCache | null {
  try {
    const raw = localStorage.getItem(SETUP_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SetupCache
    const isExpired = Date.now() - parsed.checkedAt > SETUP_CACHE_TTL_MS
    if (isExpired) return null
    return parsed
  } catch {
    return null
  }
}

export function setCachedSetup(needsSetup: boolean) {
  localStorage.setItem(
    SETUP_CACHE_KEY,
    JSON.stringify({
      needsSetup,
      checkedAt: Date.now(),
    })
  )
}

export function clearSetupCache() {
  localStorage.removeItem(SETUP_CACHE_KEY)
}
