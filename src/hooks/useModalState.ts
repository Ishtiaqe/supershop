/**
 * useModalState Hook
 * Centralizes modal/dialog state management (DRY + SRP)
 * Eliminates scattering of isOpen, selectedItem, etc. across multiple useState calls
 */

import { useState, useCallback } from 'react'

export interface ModalStateHook<T> {
  isOpen: boolean
  data: T | null
  onOpen: (data?: T) => void
  onClose: () => void
  setData: (data: T | null) => void
}

/**
 * Hook to manage modal open/close state with associated data
 * @template T The type of data the modal manages
 * @param initialData Optional initial data
 * @returns Modal state and control methods
 * @example
 * const modal = useModalState<InventoryItem>();
 * <EditModal isOpen={modal.isOpen} item={modal.data} onClose={modal.onClose} />
 */
export function useModalState<T = unknown>(initialData?: T): ModalStateHook<T> {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<T | null>(initialData ?? null)

  const onOpen = useCallback((newData?: T) => {
    if (newData !== undefined) setData(newData)
    setIsOpen(true)
  }, [])

  const onClose = useCallback(() => {
    setIsOpen(false)
    setData(null)
  }, [])

  return {
    isOpen,
    data,
    onOpen,
    onClose,
    setData,
  }
}

/**
 * Hook for managing multiple modals
 * @example
 * const modals = useModalStates();
 * <EditModal {...modals.edit} />
 * <DeleteModal {...modals.delete} />
 */
export function useModalStates(
  initialModals?: Record<string, boolean>
) {
  const [modals, setModals] = useState<Record<string, boolean>>(initialModals ?? {})

  const toggle = useCallback((name: string) => {
    setModals((prev) => ({ ...prev, [name]: !prev[name] }))
  }, [])

  const open = useCallback((name: string) => {
    setModals((prev) => ({ ...prev, [name]: true }))
  }, [])

  const close = useCallback((name: string) => {
    setModals((prev) => ({ ...prev, [name]: false }))
  }, [])

  const closeAll = useCallback(() => {
    Object.keys(modals).forEach((key) => {
      setModals((prev) => ({ ...prev, [key]: false }))
    })
  }, [modals])

  return { modals, toggle, open, close, closeAll }
}

export default useModalState
