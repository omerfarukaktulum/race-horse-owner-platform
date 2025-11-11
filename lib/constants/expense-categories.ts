export const EXPENSE_CATEGORIES = [
  { value: 'JOKEY_FEE', label: 'İdman jokeyi ücreti' },
  { value: 'GROOM_EXPENSE', label: 'Seyis giderleri' },
  { value: 'TRAINER_FEE', label: 'Antrenör ücreti' },
  { value: 'VETERINARY', label: 'Veteriner' },
  { value: 'FARRIER', label: 'Nalbant' },
  { value: 'FEED', label: 'Yem' },
  { value: 'MEDICATION', label: 'İlaç' },
  { value: 'TRANSPORTATION', label: 'Nakliye' },
  { value: 'OTHER', label: 'Diğer' },
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]['value']

