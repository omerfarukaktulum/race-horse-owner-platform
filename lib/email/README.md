# Email Notification System

Generic email notification system that respects user notification settings and sends emails via Resend.

## Features

- ✅ Respects notification settings from database
- ✅ Supports 6 notification types (horseRegistered, horseDeclared, newTraining, newExpense, newNote, newRace)
- ✅ Sends to both owners and trainers
- ✅ Beautiful HTML email templates
- ✅ Type-safe implementation
- ✅ Gracefully handles disabled notifications
- ✅ Works with or without email configuration (fails gracefully)

## Usage Examples

### 1. Send notification when a new expense is added

```typescript
import { sendHorseNotification } from '@/lib/email'

// In your API route or service
async function createExpense(horseId: string, expenseData: any) {
  // ... create expense in database ...
  
  // Get horse details for email
  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { name: true },
  })
  
  // Send notification email
  await sendHorseNotification('newExpense', horseId, {
    recipient: { email: 'user@example.com', name: 'User Name' }, // Will be fetched automatically
    horseName: horse.name,
    horseId: horseId,
    expenseDate: new Date(),
    category: 'YEM_SAMAN_OT_TALAS',
    amount: 1000,
    currency: 'TRY',
    note: 'Optional note',
  })
}
```

### 2. Send notification when a horse is registered

```typescript
import { sendHorseNotification } from '@/lib/email'

async function registerHorse(horseId: string, registrationData: any) {
  // ... create registration in database ...
  
  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { name: true },
  })
  
  await sendHorseNotification('horseRegistered', horseId, {
    recipient: { email: 'user@example.com' }, // Will be fetched automatically
    horseName: horse.name,
    horseId: horseId,
    registrationDate: new Date(),
    raceDate: registrationData.raceDate,
    city: registrationData.city,
    distance: registrationData.distance,
  })
}
```

### 3. Send notification only to owner (not trainer)

```typescript
import { sendNotificationToOwner } from '@/lib/email'

async function addNote(horseId: string, noteData: any) {
  // ... create note in database ...
  
  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    include: {
      stablemate: true,
    },
  })
  
  await sendNotificationToOwner('newNote', horse.stablemateId, {
    recipient: { email: 'user@example.com' }, // Will be fetched automatically
    horseName: horse.name,
    horseId: horseId,
    noteDate: new Date(),
    note: noteData.note,
    kiloValue: noteData.kiloValue,
  })
}
```

### 4. Send notification only to trainer

```typescript
import { sendNotificationToTrainer } from '@/lib/email'

async function addTraining(horseId: string, trainingData: any) {
  // ... create training in database ...
  
  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
    select: { name: true, trainerId: true },
  })
  
  if (horse.trainerId) {
    await sendNotificationToTrainer('newTraining', horse.trainerId, {
      recipient: { email: 'trainer@example.com' }, // Will be fetched automatically
      horseName: horse.name,
      horseId: horseId,
      trainingDate: new Date(),
      distance: trainingData.distance,
      racecourse: trainingData.racecourse,
      note: trainingData.note,
    })
  }
}
```

## Notification Types

- `horseRegistered` - When a horse is registered for a race
- `horseDeclared` - When a horse is declared for a race
- `newTraining` - When a new training/gallop is added
- `newExpense` - When a new expense is added
- `newNote` - When a new note is added
- `newRace` - When a new race result is added

## How It Works

1. **Checks notification settings**: The system first checks if the user has enabled notifications for that type
2. **Fetches recipient email**: Automatically gets the email from the database (owner or trainer)
3. **Generates email template**: Uses the appropriate HTML template for the notification type
4. **Sends email**: Uses Resend API to send the email
5. **Returns result**: Returns success/error status

## Configuration

Set these environment variables:

```env
RESEND_API_KEY="re_your_api_key_here"
RESEND_FROM_EMAIL="notifications@ekurim.com.tr"
NEXT_PUBLIC_APP_URL="https://ekurim.com.tr"
```

## Error Handling

The system gracefully handles:
- Missing email configuration (returns error but doesn't crash)
- Disabled notifications (returns success with `messageId: 'skipped'`)
- Missing users/horses (returns error)
- Email sending failures (logs error and returns failure)

## Integration Points

You should integrate email notifications in these places:

1. **Horse Registration** - `app/api/horses/[id]/registrations/route.ts`
2. **Horse Declaration** - `app/api/horses/[id]/registrations/route.ts`
3. **New Training/Gallop** - `app/api/gallops/[id]/route.ts`
4. **New Expense** - `app/api/expenses/route.ts` or `app/api/expenses/[id]/route.ts`
5. **New Note** - `app/api/horse-notes/[id]/route.ts`
6. **New Race** - `app/api/horses/[id]/races/route.ts` (if exists)

## Notes

- The `recipient` field in email data is optional - the system will fetch the email automatically
- Notifications are sent asynchronously - they won't block your API responses
- If email service is not configured, the system will log a warning but continue working

