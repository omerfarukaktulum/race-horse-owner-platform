import { z } from 'zod'
import { TR } from '@/lib/constants/tr'

// Auth schemas
export const signInSchema = z.object({
  email: z.string().email(TR.validation.invalidEmail),
  password: z.string().min(8, TR.validation.passwordTooShort),
})

export const registerOwnerSchema = z.object({
  email: z.string().email(TR.validation.invalidEmail),
  password: z.string().min(8, TR.validation.passwordTooShort),
})

export const registerTrainerSchema = z.object({
  email: z.string().email(TR.validation.invalidEmail),
  password: z.string().min(8, TR.validation.passwordTooShort),
  fullName: z.string().min(2, TR.validation.required),
  phone: z.string().optional(),
})

// Owner profile schemas
export const ownerProfileSchema = z.object({
  officialName: z.string().min(2, TR.validation.required),
  officialRef: z.string().optional(),
})

// Stablemate schemas
export const stablemateSchema = z.object({
  name: z.string().min(2, TR.validation.required),
  foundationYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  coOwners: z.array(z.string()).optional(),
  location: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
})

// Horse schemas
export const horseSchema = z.object({
  name: z.string().min(2, TR.validation.required),
  yob: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  status: z.enum(['RACING', 'STALLION', 'MARE', 'RETIRED']),
  racecourseId: z.string().optional(),
  farmId: z.string().optional(),
  trainerId: z.string().optional(),
  groomName: z.string().optional(),
  stableLabel: z.string().optional(),
  externalRef: z.string().optional(),
})

// Expense schemas
export const expenseSchema = z.object({
  horseIds: z.array(z.string()).min(1, TR.validation.required),
  date: z.date(),
  category: z.enum([
    'IDMAN_JOKEYI',
    'SEYIS',
    'ILAC',
    'YEM_SAMAN_OT',
    'EKSTRA_ILAC',
    'YARIS_KAYIT',
    'NAKLIYE',
    'SEZONLUK_AHIR',
    'OZEL',
  ]),
  customName: z.string().optional(),
  amount: z.number().positive(TR.validation.amountMustBePositive),
  currency: z.string().default('TRY'),
  note: z.string().optional(),
  photoUrl: z.string().url().optional(),
})

// Reference data schemas
export const racecourseSchema = z.object({
  name: z.string().min(2, TR.validation.required),
})

export const farmSchema = z.object({
  name: z.string().min(2, TR.validation.required),
  city: z.string().optional(),
})

// Types
export type SignInInput = z.infer<typeof signInSchema>
export type RegisterOwnerInput = z.infer<typeof registerOwnerSchema>
export type RegisterTrainerInput = z.infer<typeof registerTrainerSchema>
export type OwnerProfileInput = z.infer<typeof ownerProfileSchema>
export type StablemateInput = z.infer<typeof stablemateSchema>
export type HorseInput = z.infer<typeof horseSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>
export type RacecourseInput = z.infer<typeof racecourseSchema>
export type FarmInput = z.infer<typeof farmSchema>




