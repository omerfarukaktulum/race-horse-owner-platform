/**
 * Utility for handling Turkish characters in jsPDF
 * Since jsPDF's default fonts don't support Turkish characters well,
 * we use character mapping as a workaround
 */

/**
 * Character mapping for Turkish characters that don't render well in default fonts
 * This is a workaround - ideally we'd use a custom font
 * Note: Some characters render as "0" or "1" in default fonts, so we map them to ASCII equivalents
 * IMPORTANT: We map characters that render incorrectly (as numbers or broken) to prevent display issues
 */
const TURKISH_CHAR_MAP: Record<string, string> = {
  // Uppercase İ (capital I with dot) - renders as 0 in default fonts, map to I
  'İ': 'I',
  // Lowercase ı (dotless i) - renders as "1" in default fonts, must map to i to prevent "Kas1m" issue
  // This is necessary because default fonts don't support Turkish characters properly
  'ı': 'i',
  // Uppercase Ş - map to S
  'Ş': 'S',
  // Lowercase ş - map to s
  'ş': 's',
  // Uppercase Ğ - map to G
  'Ğ': 'G',
  // Lowercase ğ - map to g
  'ğ': 'g',
  // Uppercase Ü - map to U
  'Ü': 'U',
  // Lowercase ü - map to u
  'ü': 'u',
  // Uppercase Ö - map to O
  'Ö': 'O',
  // Lowercase ö - map to o
  'ö': 'o',
  // Uppercase Ç - map to C
  'Ç': 'C',
  // Lowercase ç - map to c
  'ç': 'c',
}

/**
 * Maps Turkish characters to ASCII equivalents for better PDF rendering
 * This is a workaround since default fonts don't support Turkish well
 */
function mapTurkishCharacters(text: string): string {
  let result = text
  Object.entries(TURKISH_CHAR_MAP).forEach(([turkish, ascii]) => {
    result = result.replace(new RegExp(turkish, 'g'), ascii)
  })
  return result
}

/**
 * Normalizes text for better Turkish character support in PDF
 * Uses NFC normalization and character mapping
 */
export function normalizeTextForPDF(text: string | undefined | null): string {
  if (!text) return ''
  
  // First normalize Unicode characters (NFC normalization)
  const normalized = text.normalize('NFC')
  
  // Then map problematic Turkish characters
  // Note: This is a workaround - for full support, a custom font is needed
  return mapTurkishCharacters(normalized)
}

/**
 * Escapes special characters that might cause issues in PDF
 */
export function escapeTextForPDF(text: string | undefined | null): string {
  if (!text) return ''
  
  const normalized = normalizeTextForPDF(text)
  
  // jsPDF should handle UTF-8, but we ensure text is properly formatted
  // Remove any null bytes or problematic characters
  return normalized.replace(/\0/g, '')
}

