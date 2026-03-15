/**
 * Utility functions for downloading blobs and files
 * Centralizes blob → download pattern (DRY)
 */

/**
 * Download a blob as a file
 * @param blob The Blob to download
 * @param filename Name of the file to save
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.parentNode?.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Download JSON data as a file
 * @param data Object to serialize and download
 * @param filename Name of the file
 */
export function downloadJSON(data: unknown, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  downloadBlob(blob, filename)
}

/**
 * Download CSV data as a file
 * @param csv CSV string
 * @param filename Name of the file
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

/**
 * Generate filename with timestamp
 * @param prefix Prefix for the filename
 * @param extension File extension (without dot)
 * @returns Formatted filename with timestamp
 */
export function generateTimestampedFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${prefix}_${timestamp}.${extension}`
}
