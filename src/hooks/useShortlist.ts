import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query'
import api from '../lib/api'

type Action = 'add' | 'remove'

interface ShortlistPayload {
  inventoryId: string
  action: Action
}

export interface UseShortlistOptions {
  onSuccess?: () => void
}

export function useShortlistMutation(
  options?: UseShortlistOptions
): UseMutationResult<unknown, unknown, ShortlistPayload> {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (payload: ShortlistPayload) => {
      const { inventoryId, action } = payload
      if (action === 'add') {
        return api.post(`/api/v1/shortlist/add/${inventoryId}`)
      }
      return api.delete(`/api/v1/shortlist/${inventoryId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shortlist'] })
      queryClient.invalidateQueries({ queryKey: ['shortlist-stats'] })
      options?.onSuccess?.()
    },
  })

  return mutation
}

export default useShortlistMutation
