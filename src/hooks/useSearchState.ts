/**
 * useSearchState Hook
 * Centralizes search/filter state management (DRY)
 * Used by inventory search, sales search, global search patterns
 */

import { useState, useCallback, useMemo } from 'react'
import debounce from 'lodash/debounce'

export interface SearchFilters {
  query: string
  [key: string]: unknown
}

export interface UseSearchStateResult<T> {
  query: string
  results: T[]
  isSearching: boolean
  filters: SearchFilters
  setQuery: (query: string) => void
  setFilters: (filters: Partial<SearchFilters>) => void
  resetSearch: () => void
  isFiltered: boolean
}

/**
 * Hook to manage search state with debouncing and filtering
 * @template T Type of items being searched
 * @param items Source items to search through
 * @param searchFn Function to perform search (can be API call or local filtering)
 * @param debounceMs Debounce delay in ms (default: 300)
 * @returns Search state and control methods
 */
export function useSearchState<T>(
  items: T[] = [],
  searchFn?: (query: string, filters: SearchFilters) => Promise<T[]>,
  debounceMs: number = 300
): UseSearchStateResult<T> {
  const [query, setQueryState] = useState('')
  const [results, setResults] = useState<T[]>(items)
  const [isSearching, setIsSearching] = useState(false)
  const [filters, setFiltersState] = useState<SearchFilters>({ query: '' })

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce(async (q: string, f: SearchFilters) => {
        setIsSearching(true)
        try {
          if (searchFn) {
            const searchResults = await searchFn(q, f)
            setResults(searchResults)
          } else {
            // Local search fallback
            const filtered = items.filter((item) =>
              JSON.stringify(item).toLowerCase().includes(q.toLowerCase())
            )
            setResults(filtered)
          }
        } catch (error) {
          console.error('Search error:', error)
          setResults([])
        } finally {
          setIsSearching(false)
        }
      }, debounceMs),
    [searchFn, items, debounceMs]
  )

  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery)
      const newFilters = { ...filters, query: newQuery }
      setFiltersState(newFilters)
      debouncedSearch(newQuery, newFilters)
    },
    [filters, debouncedSearch]
  )

  const setFilters = useCallback(
    (newFilters: Partial<SearchFilters>) => {
      const merged = { ...filters, ...newFilters }
      setFiltersState(merged)
      debouncedSearch(query, merged)
    },
    [query, filters, debouncedSearch]
  )

  const resetSearch = useCallback(() => {
    setQueryState('')
    setFiltersState({ query: '' })
    setResults(items)
    setIsSearching(false)
  }, [items])

  const isFiltered = useMemo(
    () => query !== '' || Object.keys(filters).some((k) => k !== 'query' && filters[k]),
    [query, filters]
  )

  return {
    query,
    results,
    isSearching,
    filters,
    setQuery,
    setFilters,
    resetSearch,
    isFiltered,
  }
}

export default useSearchState
