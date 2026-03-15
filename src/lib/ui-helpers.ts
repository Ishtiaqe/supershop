/**
 * UI Helper Utilities (DRY)
 * Eliminates duplicated formatting, validation, and UI logic
 */

/**
 * Format bytes to human-readable size
 * Used by: StorageMonitor, BackupManagement
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Get status color based on value (utilizes CSS variable tokens)
 * Used by: StorageMonitor, StatusIndicators
 */
export function getStatusColor(
  percentage: number
): 'success' | 'warning' | 'danger' | 'info' {
  if (percentage >= 90) return 'danger'
  if (percentage >= 70) return 'warning'
  if (percentage >= 50) return 'info'
  return 'success'
}

/**
 * Get status message for storage/quota status
 */
export function getStatusMessage(percentage: number): string {
  if (percentage >= 90) return 'Storage critically low'
  if (percentage >= 70) return 'Storage running low'
  if (percentage >= 50) return 'Storage moderately used'
  return 'Storage available'
}

/**
 * Format date in consistent manner
 */
export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (format === 'short') {
    return d.toLocaleDateString()
  }
  return d.toLocaleString()
}

/**
 * Format currency value
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number (basic)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7
}

/**
 * Generate unique ID (UUID v4-like)
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Debounce helper (complementary to lodash/debounce for when direct import isn't ideal)
 */
export function debounceEvent<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => callback(...args), delay)
  }
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, length: number, ellipsis: string = '...'): string {
  if (text.length <= length) return text
  return text.substring(0, length) + ellipsis
}

/**
 * Group array items by key
 */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = keyFn(item)
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    },
    {} as Record<string, T[]>
  )
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

export default {
  formatBytes,
  getStatusColor,
  getStatusMessage,
  formatDate,
  formatCurrency,
  isValidEmail,
  isValidPhone,
  generateId,
  debounceEvent,
  truncate,
  groupBy,
  safeJsonParse,
}
