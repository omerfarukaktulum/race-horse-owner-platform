/**
 * Email notification types
 */
export type NotificationType =
  | 'horseRegistered'
  | 'horseDeclared'
  | 'newTraining'
  | 'newExpense'
  | 'newNote'
  | 'newRace'

/**
 * Notification settings for a user/stablemate
 */
export interface NotificationSettings {
  horseRegistered: boolean
  horseDeclared: boolean
  newTraining: boolean
  newExpense: boolean
  newNote: boolean
  newRace: boolean
}

/**
 * Email recipient information
 */
export interface EmailRecipient {
  email: string
  name?: string
}

/**
 * Base email data for all notification types
 */
export interface BaseEmailData {
  recipient: EmailRecipient
  horseName: string
  horseId: string
}

/**
 * Email data for horse registered notification
 */
export interface HorseRegisteredEmailData extends BaseEmailData {
  registrationDate: Date
  raceDate?: Date
  city?: string
  distance?: number
}

/**
 * Email data for horse declared notification
 */
export interface HorseDeclaredEmailData extends BaseEmailData {
  declarationDate: Date
  raceDate: Date
  city?: string
  distance?: number
  jockeyName?: string
}

/**
 * Email data for new training notification
 */
export interface NewTrainingEmailData extends BaseEmailData {
  trainingDate: Date
  distance?: string
  racecourse?: string
  note?: string
}

/**
 * Email data for new expense notification
 */
export interface NewExpenseEmailData extends BaseEmailData {
  expenseDate: Date
  category: string
  amount: number
  currency?: string
  note?: string
}

/**
 * Email data for new note notification
 */
export interface NewNoteEmailData extends BaseEmailData {
  noteDate: Date
  note: string
  kiloValue?: number
}

/**
 * Email data for new race notification
 */
export interface NewRaceEmailData extends BaseEmailData {
  raceDate: Date
  position?: number
  city?: string
  distance?: number
  surface?: string
  prizeMoney?: number
}

/**
 * Union type for all email data types
 */
export type EmailData =
  | HorseRegisteredEmailData
  | HorseDeclaredEmailData
  | NewTrainingEmailData
  | NewExpenseEmailData
  | NewNoteEmailData
  | NewRaceEmailData

/**
 * Email sending result
 */
export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

