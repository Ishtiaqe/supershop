/**
 * Centralized authentication storage management (DRY + Encapsulation)
 * All localStorage auth access goes through this module
 * Single source of truth for auth keys and behavior
 */

const AUTH_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  TENANT: 'tenant',
} as const

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
   * Clear all authentication data
   */
  clearAuth: (): void => {
    const storage = getLocalStorage()
    if (storage) {
      storage.removeItem(AUTH_KEYS.ACCESS_TOKEN)
      storage.removeItem(AUTH_KEYS.REFRESH_TOKEN)
      storage.removeItem(AUTH_KEYS.USER)
      storage.removeItem(AUTH_KEYS.TENANT)
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return authStorage.getAccessToken() !== null
  },
}

export default authStorage
