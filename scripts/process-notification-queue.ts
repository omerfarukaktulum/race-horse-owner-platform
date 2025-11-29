/**
 * Notification Queue Processor
 * Processes pending email notifications from the queue
 * Runs via GitHub Actions at 6 AM Sweden time (5 AM UTC) daily
 */

import { PrismaClient } from '@prisma/client'
import { sendHorseNotification } from '@/lib/email/notifications'

// Use PROD_DATABASE_URL if provided, otherwise fall back to DATABASE_URL
let databaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('[Notification Processor] Error: DATABASE_URL or PROD_DATABASE_URL must be set')
  process.exit(1)
}

console.log(`[Notification Processor] Using database: ${databaseUrl.includes('supabase') || databaseUrl.includes('neon') ? 'PRODUCTION' : 'LOCAL'}`)

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: ['error', 'warn'],
})

const BATCH_SIZE = 50
const MAX_RETRIES = 3
const DELAY_BETWEEN_EMAILS = 1000 // 1 second delay between emails

/**
 * Process pending notifications
 */
async function processNotificationQueue() {
  console.log('[Notification Processor] Starting notification queue processing...')
  const startTime = Date.now()

  try {
    let processed = 0
    let sent = 0
    let skipped = 0
    let failed = 0

    // Process in batches
    while (true) {
      // Fetch PENDING notifications
      const pendingNotifications = await prisma.notificationQueue.findMany({
        where: {
          status: 'PENDING',
          retryCount: { lt: MAX_RETRIES },
        },
        take: BATCH_SIZE,
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          horse: {
            select: {
              name: true,
            },
          },
        },
      })

      if (pendingNotifications.length === 0) {
        console.log('[Notification Processor] No more pending notifications to process')
        break
      }

      console.log(`[Notification Processor] Processing batch of ${pendingNotifications.length} notifications...`)

      // Process each notification
      for (const notification of pendingNotifications) {
        try {
          // Mark as PROCESSING
          await prisma.notificationQueue.update({
            where: { id: notification.id },
            data: { status: 'PROCESSING' },
          })

          // Get notification data
          const data = notification.data as any

          // Send notification based on type
          const result = await sendHorseNotification(
            notification.type as any,
            notification.horseId,
            {
              horseId: data.horseId,
              horseName: data.horseName || notification.horse.name,
              ...(notification.type === 'newRace' && {
                raceDate: new Date(data.raceDate),
                position: data.position,
                city: data.city,
                distance: data.distance,
                prizeMoney: data.prizeMoney,
              }),
              ...(notification.type === 'horseRegistered' && {
                registrationDate: new Date(data.raceDate),
                raceDate: data.raceDate ? new Date(data.raceDate) : undefined,
                city: data.city,
                distance: data.distance,
              }),
              ...(notification.type === 'horseDeclared' && {
                declarationDate: new Date(data.raceDate),
                raceDate: new Date(data.raceDate),
                city: data.city,
                distance: data.distance,
                jockeyName: data.jockeyName,
              }),
              ...(notification.type === 'newTraining' && {
                trainingDate: new Date(data.gallopDate),
                racecourse: data.racecourse,
                distance: data.distances ? Object.keys(data.distances).join(', ') : undefined,
              }),
            } as any,
          )

          // Check if notification was sent or skipped
          if (result.owner.success) {
            if (result.owner.messageId === 'skipped') {
              // Notification disabled, mark as sent (not an error)
              await prisma.notificationQueue.update({
                where: { id: notification.id },
                data: {
                  status: 'SENT',
                  processedAt: new Date(),
                },
              })
              skipped++
            } else {
              // Successfully sent
              await prisma.notificationQueue.update({
                where: { id: notification.id },
                data: {
                  status: 'SENT',
                  processedAt: new Date(),
                },
              })
              sent++
            }
          } else {
            // Failed to send
            throw new Error(result.owner.error || 'Failed to send notification')
          }

          processed++

          // Small delay between emails to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_EMAILS))
        } catch (error: any) {
          console.error(`[Notification Processor] Error processing notification ${notification.id}:`, error.message)

          // Increment retry count
          const newRetryCount = notification.retryCount + 1

          if (newRetryCount >= MAX_RETRIES) {
            // Max retries reached, mark as FAILED
            await prisma.notificationQueue.update({
              where: { id: notification.id },
              data: {
                status: 'FAILED',
                retryCount: newRetryCount,
                error: error.message,
                processedAt: new Date(),
              },
            })
            failed++
          } else {
            // Retry later
            await prisma.notificationQueue.update({
              where: { id: notification.id },
              data: {
                status: 'PENDING',
                retryCount: newRetryCount,
                error: error.message,
              },
            })
          }
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('[Notification Processor] Processing completed!')
    console.log(`[Notification Processor] Duration: ${duration}s`)
    console.log(`[Notification Processor] Processed: ${processed}`)
    console.log(`[Notification Processor] Sent: ${sent}`)
    console.log(`[Notification Processor] Skipped (disabled): ${skipped}`)
    console.log(`[Notification Processor] Failed: ${failed}`)

    return {
      success: true,
      duration: parseFloat(duration),
      processed,
      sent,
      skipped,
      failed,
    }
  } catch (error: any) {
    console.error('[Notification Processor] Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
processNotificationQueue()
  .then((result) => {
    console.log('[Notification Processor] Success:', JSON.stringify(result, null, 2))
    process.exit(0)
  })
  .catch((error) => {
    console.error('[Notification Processor] Failed:', error)
    process.exit(1)
  })

export { processNotificationQueue }

