import { format as dateFnsFormat } from 'date-fns'
import { tr } from 'date-fns/locale'

/**
 * Format date in Turkish locale
 */
export function formatDate(date: Date | string, formatStr: string = 'dd MMMM yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateFnsFormat(dateObj, formatStr, { locale: tr })
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'dd MMMM yyyy HH:mm')
}

/**
 * Format currency in Turkish Lira
 */
export function formatCurrency(amount: number | string, currency: string = 'TRY'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numAmount)) return '₺0,00'
  
  const formatted = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount)
  
  return formatted
}

/**
 * Format number with Turkish thousand separators
 */
export function formatNumber(num: number | string): string {
  const numValue = typeof num === 'string' ? parseFloat(num) : num
  
  if (isNaN(numValue)) return '0'
  
  return new Intl.NumberFormat('tr-TR').format(numValue)
}

/**
 * Parse Turkish formatted number to float
 */
export function parseTurkishNumber(str: string): number {
  // Replace Turkish thousand separator (.) with nothing
  // Replace Turkish decimal separator (,) with .
  const normalized = str.replace(/\./g, '').replace(/,/g, '.')
  return parseFloat(normalized)
}

/**
 * Get relative time in Turkish (e.g., "2 gün önce")
 */
export function getRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'az önce'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} gün önce`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} hafta önce`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} ay önce`
  return `${Math.floor(diffInSeconds / 31536000)} yıl önce`
}


