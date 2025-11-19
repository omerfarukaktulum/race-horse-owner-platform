export const formatGallopStatus = (status?: string): string => {
  if (!status) return ''

  const normalized = status.trim().toUpperCase()
  const statusMap: Record<string, string> = {
    R: 'Rahat',
    ÇR: 'Çok Rahat',
    Ç: 'Çalışarak',
    HÇ: 'Hafif Çalışarak',
    HR: 'Hafif Rahat',
  }

  return statusMap[normalized] || status
}

