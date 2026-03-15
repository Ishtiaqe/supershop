/**
 * API hooks for backup and data management operations
 * Centralizes backup/export/import logic (DRY + SRP)
 * Used by: data-management page, UserDataExport component
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ApiResponse, BackupStatus, ErrorResponse } from '@/types'

/**
 * Hook for fetching backup status
 */
export function useBackupStatus() {
  return useQuery({
    queryKey: ['backup-status'],
    queryFn: async () => {
      const response = await api.get<BackupStatus>('/backup/status')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for exporting backup data
 */
export function useBackupExport() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.get('/backup/export', {
        responseType: 'blob',
      })
      return response.data
    },
  })
}

/**
 * Hook for importing backup data
 */
export function useBackupImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post<ApiResponse>('/backup/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-status'] })
    },
  })
}

/**
 * Hook for exporting user data (GDPR)
 * Used by admin to export a specific user's data across all tables
 */
export function useUserDataExport() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.get(`/backup/export-user/${userId}`, {
        responseType: 'blob',
      })
      return response.data
    },
  })
}

/**
 * Hook for searching users (for export/GDPR functionality)
 * Primarily for admins to find and export specific user data
 */
export function useUserSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await api.get<any[]>('/users/search', {
        params: { q: query },
      })
      return response.data
    },
  })
}

/**
 * Hook combining all backup operations
 * Simplifies page-level usage (DRY)
 */
export function useBackupManagement() {
  const backupStatus = useBackupStatus()
  const backupExport = useBackupExport()
  const backupImport = useBackupImport()

  return {
    backupStatus,
    backupExport,
    backupImport,
    isLoading:
      backupStatus.isLoading || backupExport.isPending || backupImport.isPending,
    error: backupStatus.error || backupExport.error || backupImport.error,
  }
}

export default useBackupManagement
