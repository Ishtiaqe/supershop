/**
 * useAsyncData Hook
 * Centralizes async data fetching with loading/error management (DRY + SRP)
 * Replaces duplicate: useState(loading), useState(error) patterns across components
 */

import { useState, useCallback, useRef } from 'react'
import { AsyncState, ErrorResponse } from '@/types'

export interface UseAsyncDataOptions {
  onSuccess?: () => void
  onError?: (error: ErrorResponse) => void
  onFinally?: () => void
}

/**
 * Hook to manage async data fetching with loading and error states
 * @template T The type of data being fetched
 * @param initialData Initial state for data
 * @returns State and execute function
 * @example
 * const { data, loading, error, execute } = useAsyncData<InventoryItem[]>([]);
 * const handleFetch = async () => {
 *   execute(async () => {
 *     const res = await api.get('/inventory');
 *     return res.data;
 *   });
 * };
 */
export function useAsyncData<T = unknown>(
  initialData: T | null = null,
  options: UseAsyncDataOptions = {}
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  const execute = useCallback(
    async (fn: () => Promise<T>) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const result = await fn()
        setState((prev) => ({
          ...prev,
          data: result,
          loading: false,
          error: null,
        }))
        options.onSuccess?.()
      } catch (err: unknown) {
        const error = parseError(err)
        setState((prev) => ({
          ...prev,
          loading: false,
          error,
        }))
        options.onError?.(error)
      } finally {
        options.onFinally?.()
      }
    },
    [options]
  )

  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: false,
      error: null,
    })
  }, [initialData])

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setState((prev) => ({ ...prev, loading: false }))
  }, [])

  return {
    ...state,
    execute,
    reset,
    cancel,
    setData: (data: T) => setState((prev) => ({ ...prev, data })),
    setError: (error: ErrorResponse | null) => setState((prev) => ({ ...prev, error })),
  }
}

/**
 * Parse error from various types and convert to ErrorResponse
 */
function parseError(err: unknown): ErrorResponse {
  if (typeof err === 'string') {
    return { message: err, statusCode: 500 }
  }

  if (err instanceof Error) {
    return {
      message: err.message,
      code: (err as any).code,
      statusCode: (err as any).status || 500,
    }
  }

  if (typeof err === 'object' && err !== null) {
    const obj = err as any
    if (obj.response?.data?.message) {
      return {
        message: obj.response.data.message,
        code: obj.code,
        statusCode: obj.response.status,
        details: obj.response.data,
      }
    }

    if (obj.message) {
      return {
        message: obj.message,
        code: obj.code,
        statusCode: obj.statusCode || 500,
      }
    }
  }

  return { message: 'An unknown error occurred', statusCode: 500 }
}

export default useAsyncData
