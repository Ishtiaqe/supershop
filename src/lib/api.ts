import { offlineApi } from './api-offline'
import { NetworkDetector } from './offline-utils'
import { router } from './api/router'
import { registerAllRoutes } from './api/routes'
import { getLocalStorageData } from './api/utils'

const networkDetector = NetworkDetector.getInstance()

registerAllRoutes(router)

const GET_CACHE_PREFIX = 'api_get_cache:'
const GET_CACHE_TTL = 30 * 1000
const SKIP_CACHE_PATTERNS = ['/users/me', '/auth/', '/backup/']

function getCachedGet(url: string): any | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(GET_CACHE_PREFIX + url)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.ts > GET_CACHE_TTL) {
      localStorage.removeItem(GET_CACHE_PREFIX + url)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

function setCachedGet(url: string, data: any): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(GET_CACHE_PREFIX + url, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

function shouldSkipCache(url: string): boolean {
  return SKIP_CACHE_PATTERNS.some(pattern => url.includes(pattern))
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
    console.error(`[Serverless-API Error] ${method} ${url}:`, error)
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
  interceptors: {
    request: { use: () => { } },
    response: { use: () => { } }
  }
}

if (typeof window !== 'undefined') {
  (window as any).api = api
}

export default api
