// Simple IndexedDB wrapper for caching master data (products, variants)

const DB_NAME = 'supershop_cache'
const DB_VERSION = 1
const STORES = {
  products: 'products',
  variants: 'variants',
} as const

type StoreName = keyof typeof STORES

interface CacheItem<T> {
  id: string
  data: T
  timestamp: number
  ttl: number
}

class IndexedDBCache {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(STORES.products)) {
          db.createObjectStore(STORES.products, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORES.variants)) {
          db.createObjectStore(STORES.variants, { keyPath: 'id' })
        }
      }
    })
  }

  async set<T>(store: StoreName, key: string, data: T, ttlMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('DB not initialized')

    const item: CacheItem<T> = {
      id: key,
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES[store]], 'readwrite')
      const objectStore = transaction.objectStore(STORES[store])
      const request = objectStore.put({ ...item, id: key })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async get<T>(store: StoreName, key: string): Promise<T | null> {
    await this.init()
    if (!this.db) throw new Error('DB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES[store]], 'readonly')
      const objectStore = transaction.objectStore(STORES[store])
      const request = objectStore.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result as CacheItem<T> | undefined
        if (!result) {
          resolve(null)
          return
        }

        const isExpired = Date.now() - result.timestamp > result.ttl
        if (isExpired) {
          // Clean up expired entry
          this.delete(store, key).catch(() => {}) // Fire and forget
          resolve(null)
          return
        }

        resolve(result.data)
      }
    })
  }

  async getAll<T>(store: StoreName): Promise<T[]> {
    await this.init()
    if (!this.db) throw new Error('DB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES[store]], 'readonly')
      const objectStore = transaction.objectStore(STORES[store])
      const request = objectStore.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const results = request.result as CacheItem<T>[]
        const now = Date.now()
        const validData = results
          .filter(item => now - item.timestamp <= item.ttl)
          .map(item => item.data)

        // Clean up expired entries in background
        const expiredKeys = results
          .filter(item => now - item.timestamp > item.ttl)
          .map(item => item.id)
        if (expiredKeys.length > 0) {
          expiredKeys.forEach(key => this.delete(store, key).catch(() => {}))
        }

        resolve(validData)
      }
    })
  }

  async delete(store: StoreName, key: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('DB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES[store]], 'readwrite')
      const objectStore = transaction.objectStore(STORES[store])
      const request = objectStore.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clear(store: StoreName): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('DB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES[store]], 'readwrite')
      const objectStore = transaction.objectStore(STORES[store])
      const request = objectStore.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }
}

export const idbCache = new IndexedDBCache()
export type { StoreName }
