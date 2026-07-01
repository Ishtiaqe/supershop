/**
 * Centralized authentication storage management (DRY + Encapsulation)
 * All localStorage auth access goes through this module
 * Single source of truth for auth keys and behavior
 */

const AUTH_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  TOKEN_EXPIRES_AT: 'tokenExpiresAt',
  USER: 'user',
  TENANT: 'tenant',
} as const

/**
 * Safe sessionStorage access with TTL support
 * Handles SSR scenarios where sessionStorage is undefined
 */
function getSessionStorage() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage
}

interface SessionItem<T> {
  data: T
  expiresAt: number
}

export const sessionStorageWithTTL = {
  /**
   * Set an item in sessionStorage with TTL
   */
  setItemWithTTL: <T>(key: string, value: T, ttlMs: number): void => {
    const storage = getSessionStorage()
    if (!storage) return

    try {
      const item: SessionItem<T> = {
        data: value,
        expiresAt: Date.now() + ttlMs,
      }
      storage.setItem(key, JSON.stringify(item))
    } catch (e) {
      console.warn('Failed to set sessionStorage item:', e)
    }
  },

  /**
   * Get an item from sessionStorage, checking TTL
   * Returns null if expired or not found
   */
  getItemWithTTL: <T>(key: string): T | null => {
    const storage = getSessionStorage()
    if (!storage) return null

    try {
      const raw = storage.getItem(key)
      if (!raw) return null

      const item: SessionItem<T> = JSON.parse(raw)

      // Check if expired
      if (Date.now() > item.expiresAt) {
        storage.removeItem(key)
        return null
      }

      return item.data
    } catch (e) {
      console.warn('Failed to get sessionStorage item:', e)
      return null
    }
  },

  /**
   * Clear all expired sessionStorage items
   */
  clearExpiredSessionItems: (): void => {
    const storage = getSessionStorage()
    if (!storage) return

    try {
      const now = Date.now()
      const keysToRemove: string[] = []

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (!key) continue

        try {
          const raw = storage.getItem(key)
          if (!raw) continue

          const item: SessionItem<unknown> = JSON.parse(raw)
          if (item.expiresAt && now > item.expiresAt) {
            keysToRemove.push(key)
          }
        } catch {
          // Skip items that aren't TTL-formatted
          continue
        }
      }

      keysToRemove.forEach(key => storage.removeItem(key))
    } catch (e) {
      console.warn('Failed to clear expired sessionStorage items:', e)
    }
  },
}

/**
 * Safe localStorage access with type safety
 * Handles SSR scenarios where localStorage is undefined
 */
function getLocalStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export const authStorage = {
  /**
   * Get the current access token
   */
  getAccessToken: (): string | null => {
    const storage = getLocalStorage()
    return storage?.getItem(AUTH_KEYS.ACCESS_TOKEN) ?? null
  },

  /**
   * Set the access token
   */
  setAccessToken: (token: string): void => {
    const storage = getLocalStorage()
    if (storage) storage.setItem(AUTH_KEYS.ACCESS_TOKEN, token)
  },

  /**
   * Get the refresh token
   */
  getRefreshToken: (): string | null => {
    const storage = getLocalStorage()
    return storage?.getItem(AUTH_KEYS.REFRESH_TOKEN) ?? null
  },

  /**
   * Set the refresh token
   */
  setRefreshToken: (token: string): void => {
    const storage = getLocalStorage()
    if (storage) storage.setItem(AUTH_KEYS.REFRESH_TOKEN, token)
  },

  /**
   * Get the stored user object
   */
  getUser: () => {
    const storage = getLocalStorage()
    const user = storage?.getItem(AUTH_KEYS.USER)
    return user ? JSON.parse(user) : null
  },

  /**
   * Set the user object
   */
  setUser: (user: Record<string, unknown>): void => {
    const storage = getLocalStorage()
    if (storage) storage.setItem(AUTH_KEYS.USER, JSON.stringify(user))
  },

  /**
   * Get the stored tenant object
   */
  getTenant: () => {
    const storage = getLocalStorage()
    const tenant = storage?.getItem(AUTH_KEYS.TENANT)
    return tenant ? JSON.parse(tenant) : null
  },

  /**
   * Set the tenant object
   */
  setTenant: (tenant: Record<string, unknown>): void => {
    const storage = getLocalStorage()
    if (storage) storage.setItem(AUTH_KEYS.TENANT, JSON.stringify(tenant))
  },

  /**
   * Get the token expiry timestamp (ms since epoch)
   */
  getExpiresAt: (): number | null => {
    const storage = getLocalStorage()
    const raw = storage?.getItem(AUTH_KEYS.TOKEN_EXPIRES_AT)
    return raw ? Number(raw) : null
  },

  /**
   * Set the token expiry timestamp (ms since epoch)
   */
  setExpiresAt: (expiresAt: number): void => {
    const storage = getLocalStorage()
    if (storage) storage.setItem(AUTH_KEYS.TOKEN_EXPIRES_AT, String(expiresAt))
  },

  /**
   * Check if user is authenticated (has access token)
   */
  isAuthenticated: (): boolean => {
    return authStorage.getAccessToken() !== null
  },

  /**
   * Check if the access token is expired or about to expire
   * Returns true if token should be refreshed (within 5 min of expiry)
   */
  shouldRefreshToken: (): boolean => {
    const expiresAt = authStorage.getExpiresAt()
    if (!expiresAt) return false
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    return now > (expiresAt - fiveMinutes)
  },

  /**
   * Check if the access token is fully expired
   */
  isTokenExpired: (): boolean => {
    const expiresAt = authStorage.getExpiresAt()
    if (!expiresAt) return false
    return Date.now() > expiresAt
  },

  /**
   * Clear all authentication data
   */
  clearAuth: (): void => {
    const storage = getLocalStorage()
    if (storage) {
      storage.removeItem(AUTH_KEYS.ACCESS_TOKEN)
      storage.removeItem(AUTH_KEYS.REFRESH_TOKEN)
      storage.removeItem(AUTH_KEYS.TOKEN_EXPIRES_AT)
      storage.removeItem(AUTH_KEYS.USER)
      storage.removeItem(AUTH_KEYS.TENANT)
    }
  },
}

export default authStorage
