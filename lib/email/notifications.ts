import { prisma } from '@/lib/prisma'
import { sendEmail } from './service'
import {
  horseRegisteredTemplate,
  horseDeclaredTemplate,
  newTrainingTemplate,
  newExpenseTemplate,
  newNoteTemplate,
  newRaceTemplate,
} from './templates'
import type {
  NotificationType,
  NotificationSettings,
  EmailRecipient,
  HorseRegisteredEmailData,
  HorseDeclaredEmailData,
  NewTrainingEmailData,
  NewExpenseEmailData,
  NewNoteEmailData,
  NewRaceEmailData,
  EmailResult,
} from './types'

/**
 * Map notification type to database field name
 */
const NOTIFICATION_FIELD_MAP: Record<NotificationType, keyof NotificationSettings> = {
  horseRegistered: 'horseRegistered',
  horseDeclared: 'horseDeclared',
  newTraining: 'newTraining',
  newExpense: 'newExpense',
  newNote: 'newNote',
  newRace: 'newRace',
}

/**
 * Get notification settings for a stablemate (owner)
 */
async function getStablemateNotificationSettings(
  stablemateId: string,
): Promise<NotificationSettings | null> {
  const stablemate = await prisma.stablemate.findUnique({
    where: { id: stablemateId },
    select: {
      notifyHorseRegistered: true,
      notifyHorseDeclared: true,
      notifyNewTraining: true,
      notifyNewExpense: true,
      notifyNewNote: true,
      notifyNewRace: true,
      owner: {
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  })

  if (!stablemate) return null

  return {
    horseRegistered: stablemate.notifyHorseRegistered,
    horseDeclared: stablemate.notifyHorseDeclared,
    newTraining: stablemate.notifyNewTraining,
    newExpense: stablemate.notifyNewExpense,
    newNote: stablemate.notifyNewNote,
    newRace: stablemate.notifyNewRace,
  }
}

/**
 * Get notification settings for a trainer
 */
async function getTrainerNotificationSettings(
  trainerId: string,
): Promise<NotificationSettings | null> {
  const trainer = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    select: {
      notifyHorseRegistered: true,
      notifyHorseDeclared: true,
      notifyNewTraining: true,
      notifyNewExpense: true,
      notifyNewNote: true,
      notifyNewRace: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  })

  if (!trainer) return null

  return {
    horseRegistered: trainer.notifyHorseRegistered,
    horseDeclared: trainer.notifyHorseDeclared,
    newTraining: trainer.notifyNewTraining,
    newExpense: trainer.notifyNewExpense,
    newNote: trainer.notifyNewNote,
    newRace: trainer.notifyNewRace,
  }
}

/**
 * Get owner email from stablemate
 */
async function getOwnerEmailFromStablemate(stablemateId: string): Promise<string | null> {
  const stablemate = await prisma.stablemate.findUnique({
    where: { id: stablemateId },
    include: {
      owner: {
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  })

  return stablemate?.owner?.user?.email || null
}

/**
 * Get trainer email from trainer profile
 */
async function getTrainerEmail(trainerId: string): Promise<string | null> {
  const trainer = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  })

  return trainer?.user?.email || null
}

/**
 * Send notification email to owner (stablemate)
 */
export async function sendNotificationToOwner(
  type: NotificationType,
  stablemateId: string,
  data: Omit<HorseRegisteredEmailData | HorseDeclaredEmailData | NewTrainingEmailData | NewExpenseEmailData | NewNoteEmailData | NewRaceEmailData, 'recipient'>,
): Promise<EmailResult> {
  // Get notification settings and owner info
  const stablemate = await prisma.stablemate.findUnique({
    where: { id: stablemateId },
    select: {
      notifyHorseRegistered: true,
      notifyHorseDeclared: true,
      notifyNewTraining: true,
      notifyNewExpense: true,
      notifyNewNote: true,
      notifyNewRace: true,
      owner: {
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  })

  if (!stablemate) {
    return { success: false, error: 'Stablemate not found' }
  }

  // Check if notification is enabled
  const fieldName = NOTIFICATION_FIELD_MAP[type]
  if (!stablemate[fieldName]) {
    return { success: true, messageId: 'skipped' } // Notification disabled, but not an error
  }

  // Get owner email
  const email = stablemate.owner?.user?.email
  if (!email) {
    return { success: false, error: 'Owner email not found' }
  }

  // Prepare email data with recipient
  const emailData = {
    ...data,
    recipient: {
      email,
      name: stablemate.owner?.user?.email, // Can be enhanced with actual name if available
    },
  }

  // Get template based on type
  let html: string
  let subject: string

  switch (type) {
    case 'horseRegistered':
      html = horseRegisteredTemplate(emailData as HorseRegisteredEmailData)
      subject = `Yeni At Kaydı: ${data.horseName}`
      break
    case 'horseDeclared':
      html = horseDeclaredTemplate(emailData as HorseDeclaredEmailData)
      subject = `Yeni At Deklarasyonu: ${data.horseName}`
      break
    case 'newTraining':
      html = newTrainingTemplate(emailData as NewTrainingEmailData)
      subject = `Yeni İdman Kaydı: ${data.horseName}`
      break
    case 'newExpense':
      html = newExpenseTemplate(emailData as NewExpenseEmailData)
      subject = `Yeni Gider Kaydı: ${data.horseName}`
      break
    case 'newNote':
      html = newNoteTemplate(emailData as NewNoteEmailData)
      subject = `Yeni Not: ${data.horseName}`
      break
    case 'newRace':
      html = newRaceTemplate(emailData as NewRaceEmailData)
      subject = `Yeni Yarış Sonucu: ${data.horseName}`
      break
    default:
      return { success: false, error: 'Unknown notification type' }
  }

  // Send email
  return sendEmail({
    to: email,
    from: process.env.RESEND_FROM_EMAIL || 'notifications@ekurim.com.tr',
    subject,
    html,
  })
}

/**
 * Send notification email to trainer
 */
export async function sendNotificationToTrainer(
  type: NotificationType,
  trainerId: string,
  data: Omit<HorseRegisteredEmailData | HorseDeclaredEmailData | NewTrainingEmailData | NewExpenseEmailData | NewNoteEmailData | NewRaceEmailData, 'recipient'>,
): Promise<EmailResult> {
  // Get notification settings and trainer info
  const trainer = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    select: {
      notifyHorseRegistered: true,
      notifyHorseDeclared: true,
      notifyNewTraining: true,
      notifyNewExpense: true,
      notifyNewNote: true,
      notifyNewRace: true,
      fullName: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  })

  if (!trainer) {
    return { success: false, error: 'Trainer not found' }
  }

  // Check if notification is enabled
  const fieldName = NOTIFICATION_FIELD_MAP[type]
  if (!trainer[fieldName]) {
    return { success: true, messageId: 'skipped' } // Notification disabled, but not an error
  }

  // Get trainer email
  const email = trainer.user?.email
  if (!email) {
    return { success: false, error: 'Trainer email not found' }
  }

  // Prepare email data with recipient
  const emailData = {
    ...data,
    recipient: {
      email,
      name: trainer.fullName,
    },
  }

  // Get template based on type
  let html: string
  let subject: string

  switch (type) {
    case 'horseRegistered':
      html = horseRegisteredTemplate(emailData as HorseRegisteredEmailData)
      subject = `Yeni At Kaydı: ${data.horseName}`
      break
    case 'horseDeclared':
      html = horseDeclaredTemplate(emailData as HorseDeclaredEmailData)
      subject = `Yeni At Deklarasyonu: ${data.horseName}`
      break
    case 'newTraining':
      html = newTrainingTemplate(emailData as NewTrainingEmailData)
      subject = `Yeni İdman Kaydı: ${data.horseName}`
      break
    case 'newExpense':
      html = newExpenseTemplate(emailData as NewExpenseEmailData)
      subject = `Yeni Gider Kaydı: ${data.horseName}`
      break
    case 'newNote':
      html = newNoteTemplate(emailData as NewNoteEmailData)
      subject = `Yeni Not: ${data.horseName}`
      break
    case 'newRace':
      html = newRaceTemplate(emailData as NewRaceEmailData)
      subject = `Yeni Yarış Sonucu: ${data.horseName}`
      break
    default:
      return { success: false, error: 'Unknown notification type' }
  }

  // Send email
  return sendEmail({
    to: email,
    from: process.env.RESEND_FROM_EMAIL || 'notifications@ekurim.com.tr',
    subject,
    html,
  })
}

/**
 * Send notification to both owner and trainer (if applicable)
 * This is a convenience function for common use cases
 */
export async function sendHorseNotification(
  type: NotificationType,
  horseId: string,
  data: Omit<HorseRegisteredEmailData | HorseDeclaredEmailData | NewTrainingEmailData | NewExpenseEmailData | NewNoteEmailData | NewRaceEmailData, 'recipient'>,
): Promise<{ owner: EmailResult; trainer?: EmailResult }> {
  // Get horse with stablemate and trainer
  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: {
      stablemateId: true,
      trainerId: true,
    },
  })

  if (!horse) {
    return {
      owner: { success: false, error: 'Horse not found' },
    }
  }

  // Send to owner
  const ownerResult = await sendNotificationToOwner(type, horse.stablemateId, data)

  // Send to trainer if exists
  let trainerResult: EmailResult | undefined
  if (horse.trainerId) {
    trainerResult = await sendNotificationToTrainer(type, horse.trainerId, data)
  }

  return {
    owner: ownerResult,
    trainer: trainerResult,
  }
}

