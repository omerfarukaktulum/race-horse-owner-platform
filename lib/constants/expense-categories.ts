export const EXPENSE_CATEGORIES = [
  { value: 'YARIS_KAYIT_DECLARE', label: 'Yarış Kayıt/Deklare Giderleri' },
  { value: 'YEM_SAMAN_OT_TALAS', label: 'Saman/Ot/Yem/Talaş Giderleri' },
  { value: 'ILAC', label: 'İlaç Giderleri' },
  { value: 'SEYIS', label: 'Seyis Giderleri' },
  { value: 'SIGORTA', label: 'Sigorta Giderleri' },
  { value: 'MONT', label: 'Mont Giderleri' },
  { value: 'IDMAN_JOKEYI', label: 'İdman Jokeyi Ücreti' },
  { value: 'NAL_NALBANT', label: 'Nal/Nalbant Giderleri' },
  { value: 'SARAC', label: 'Saraç Giderleri' },
  { value: 'NAKLIYE', label: 'Nakliye (Hipodrom Arası) Ücreti' },
  { value: 'SEZONLUK_AHIR', label: 'Sezonluk/Ahır Ücreti' },
] as const

// Categories that require horse selection
export const HORSE_REQUIRED_CATEGORIES = ['ILAC', 'MONT', 'NAKLIYE'] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]['value']

