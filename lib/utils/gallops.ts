export const formatGallopStatus = (status?: string): string => {
  if (!status) return ''

  const normalized = status.trim().toUpperCase()
  const statusMap: Record<string, string> = {
    R: 'Rahat',
    ÇR: 'Çok R.',
    Ç: 'Çalışarak',
    HÇ: 'Hafif Ç.',
    HR: 'Hafif R.',
  }

  return statusMap[normalized] || status
}

