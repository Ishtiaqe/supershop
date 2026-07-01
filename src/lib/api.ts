import { offlineApi } from './api-offline'
import { NetworkDetector } from './offline-utils'
import { router } from './api/router'
import { registerAllRoutes } from './api/routes'
import { getLocalStorageData } from './api/utils'

const networkDetector = NetworkDetector.getInstance()

registerAllRoutes(router)

const GET_CACHE_PREFIX = 'api_get_cache:'
const GET_CACHE_TTL = 30 * 1000
const SKIP_CACHE_PATTERNS = ['/users/me', '/auth/', '/backup/', '/export/pdf', '/credits', '/shortlist', '/cash-box']
const MAX_CACHEABLE_SIZE = 500 // Don't cache responses larger than this

function getCachedGet(url: string): any | null {
  if (typeof window === 'undefined') return null
  try {
    const { tenantId } = getLocalStorageData()
    const cacheKey = GET_CACHE_PREFIX + tenantId + ':' + url
    const raw = localStorage.getItem(cacheKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.ts > GET_CACHE_TTL) {
      localStorage.removeItem(cacheKey)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

function setCachedGet(url: string, data: any): void {
  if (typeof window === 'undefined') return

  const { tenantId } = getLocalStorageData()
  const cacheKey = GET_CACHE_PREFIX + tenantId + ':' + url

  // Don't cache large arrays to avoid localStorage overflow
  const dataSize = Array.isArray(data) ? data.length : 1
  if (dataSize > MAX_CACHEABLE_SIZE) return

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

function shouldSkipCache(url: string): boolean {
  return SKIP_CACHE_PATTERNS.some(pattern => url.includes(pattern))
}

function clearApiCache(tenantId?: string): void {
  if (typeof window === 'undefined') return
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(GET_CACHE_PREFIX)) {
        if (tenantId) {
          // Clear only cache entries for this tenant
          if (key.startsWith(GET_CACHE_PREFIX + tenantId + ':')) {
            keysToRemove.push(key)
          }
        } else {
          // Clear all API cache entries
          keysToRemove.push(key)
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (e) {
    console.warn('Failed to clear API cache:', e)
  }
}

async function handleRequest(method: string, url: string, requestData?: any): Promise<any> {
  const isOnline = networkDetector.isOnline()

  if (!isOnline) {
    console.warn(`[Offline] Routing ${method} ${url} to IndexedDB`)
    return offlineApi.request({ method, url, data: requestData })
  }

  const normalizedUrl = url.replace(/^\/api\/v1/, '')
  const cleanUrl = normalizedUrl.split('?')[0]
  const query = new URLSearchParams(normalizedUrl.includes('?') ? normalizedUrl.split('?')[1] : '')
  const { tenantId, userId } = getLocalStorageData()

  if (method === 'GET' && !shouldSkipCache(cleanUrl)) {
    const cached = getCachedGet(normalizedUrl)
    if (cached) {
      return cached
    }
  }

  try {
    const result = await router.dispatch(method, cleanUrl, url, query, requestData, { tenantId, userId })
    if (method === 'GET' && !shouldSkipCache(cleanUrl)) {
      setCachedGet(normalizedUrl, result)
    }
    return result
  } catch (error: any) {
    console.error(`[API Error] ${method} ${url}:`, error)
    const status = error.status || 500
    const errObj: any = new Error(error.message || 'API request failed')
    errObj.response = {
      status,
      data: { message: error.message || 'Internal API Error' }
    }
    throw errObj
  }
}

const api = {
  get: <T = any>(url: string, config?: any): Promise<{ data: T }> => {
    return handleRequest('GET', url + (config?.params ? '?' + new URLSearchParams(config.params).toString() : ''))
  },
  post: <T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> => {
    return handleRequest('POST', url, data)
  },
  put: <T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> => {
    return handleRequest('PUT', url, data)
  },
  patch: <T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> => {
    return handleRequest('PATCH', url, data)
  },
  delete: <T = any>(url: string, config?: any): Promise<{ data: T }> => {
    return handleRequest('DELETE', url)
  },
  clearCache: clearApiCache,
  interceptors: {
    request: { use: () => { } },
    response: { use: () => { } }
  }
}

if (typeof window !== 'undefined') {
  (window as any).api = api
}

export default api
