export const EXPENSE_CATEGORIES = [
  { value: 'IDMAN_JOKEYI', label: 'İdman Jokeyi Ücreti' },
  { value: 'SEYIS', label: 'Seyis Giderleri' },
  { value: 'ILAC', label: 'İlaç Giderleri' },
  { value: 'YEM_SAMAN_OT', label: 'Saman/Ot/Yem Giderleri' },
  { value: 'EKSTRA_ILAC', label: 'Ekstra İlaç Giderleri' },
  { value: 'YARIS_KAYIT', label: 'Yarış Kayıt Giderleri' },
  { value: 'NAKLIYE', label: 'Nakliye (Hipodrom Arası)' },
  { value: 'SEZONLUK_AHIR', label: 'Sezonluk/Ahır Ücreti' },
  { value: 'OZEL', label: 'Özel' },
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]['value']

