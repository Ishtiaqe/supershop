import { useQuery, UseQueryOptions } from '@tanstack/react-query'

interface UseCachedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  cacheKey: string
  ttl?: number
}

export function useCachedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: UseCachedQueryOptions<T>
) {
  const { cacheKey, ttl = 10 * 60 * 1000, ...queryOptions } = options

  return useQuery<T>({
    queryKey,
    queryFn: async () => {
      const data = await queryFn()
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data, ts: Date.now(), ttl })
        )
      } catch {}
      return data
    },
    initialData: () => {
      if (typeof window === 'undefined') return undefined
      try {
        const raw = localStorage.getItem(cacheKey)
        if (!raw) return undefined
        const parsed = JSON.parse(raw)
        if (parsed.ts && Date.now() - parsed.ts < (parsed.ttl || ttl)) {
          return parsed.data as T
        }
      } catch {}
      return undefined
    },
    ...queryOptions,
  })
}

export default useCachedQuery
