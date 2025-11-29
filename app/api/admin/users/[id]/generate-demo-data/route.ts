import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
import { BANNED_MEDICINES } from '@/lib/constants/banned-medicines'

// Expense categories
const EXPENSE_CATEGORIES = [
  'IDMAN_JOKEYI',
  'SEYIS',
  'ILAC',
  'YEM_SAMAN_OT_TALAS',
  'YARIS_KAYIT_DECLARE',
  'NAKLIYE',
  'SEZONLUK_AHIR',
] as const

/**
 * Get Turkish description for expense category
 */
function getExpenseDescription(category: string): string {
  const descriptions: { [key: string]: string } = {
    'IDMAN_JOKEYI': 'İdman jokeyi ücreti',
    'SEYIS': 'Seyis ücreti',
    'ILAC': 'İlaç ve tedavi masrafları',
    'YEM_SAMAN_OT_TALAS': 'Yem, saman, ot ve talaş giderleri',
    'YARIS_KAYIT_DECLARE': 'Yarış kayıt ve deklare ücreti',
    'NAKLIYE': 'Nakliye ve taşıma giderleri',
    'SEZONLUK_AHIR': 'Sezonluk ahır kirası',
  }
  return descriptions[category] || 'Genel gider'
}

/**
 * Generate demo data for a specific stablemate's horses
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Admin authentication check
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      role: string
    }

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin only' },
        { status: 403 }
      )
    }

    const userId = params.id

    // Use admin Prisma client (respects database switch preference)
    const prisma = getAdminPrismaClient()

    // Verify user exists and is an OWNER
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownerProfile: {
          include: {
            stablemate: {
              include: {
                horses: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'This operation is only available for OWNER users' },
        { status: 400 }
      )
    }

    if (!user.ownerProfile) {
      return NextResponse.json(
        { error: 'Owner profile not found' },
        { status: 404 }
      )
    }

    if (!user.ownerProfile.stablemate) {
      return NextResponse.json(
        { error: 'Stablemate not found. Please create a stablemate first.' },
        { status: 404 }
      )
    }

    const stablemate = user.ownerProfile.stablemate
    const horses = stablemate.horses

    if (horses.length === 0) {
      return NextResponse.json(
        { error: 'No horses found for this stablemate. Please add horses first.' },
        { status: 400 }
      )
    }

    const now = new Date()
    const results = {
      expenses: 0,
      notes: 0,
      illnesses: 0,
      illnessOperations: 0,
      bannedMedicines: 0,
      trainingPlans: 0,
    }

    // Generate expenses (5-10 per horse)
    for (const horse of horses) {
      const numExpenses = Math.floor(Math.random() * 6) + 5
      for (let i = 0; i < numExpenses; i++) {
        const daysAgo = Math.floor(Math.random() * 30) + 1
        const expenseDate = new Date(now)
        expenseDate.setDate(expenseDate.getDate() - daysAgo)

        const category = EXPENSE_CATEGORIES[Math.floor(Math.random() * EXPENSE_CATEGORIES.length)]
        const amount = Math.floor(Math.random() * 5000) + 500 // 500-5500 TRY
        const description = getExpenseDescription(category)

        await prisma.expense.create({
          data: {
            horseId: horse.id,
            addedById: user.id,
            date: expenseDate,
            category: category as any,
            amount: amount,
            currency: 'TRY',
            note: description,
          },
        })
        results.expenses++
      }
    }

    // Generate notes (5-10 per horse)
    const noteTemplates = [
      'At sağlıklı görünüyor, iştahı yerinde.',
      'Günlük gezinti yapıldı, herhangi bir sorun yok.',
      'Rutin sağlık kontrolü yapıldı, normal.',
      'Yem takibi yapıldı, miktar normal seviyede.',
      'Antrenman sonrası kontrol edildi, her şey yolunda.',
    ]

    for (const horse of horses) {
      const numNotes = Math.floor(Math.random() * 6) + 5
      for (let i = 0; i < numNotes; i++) {
        const daysAgo = Math.floor(Math.random() * 14) + 1
        const noteDate = new Date(now)
        noteDate.setDate(noteDate.getDate() - daysAgo)

        const noteText = noteTemplates[Math.floor(Math.random() * noteTemplates.length)]

        await prisma.horseNote.create({
          data: {
            horseId: horse.id,
            addedById: user.id,
            date: noteDate,
            note: noteText,
          },
        })
        results.notes++
      }
    }

    // Generate illnesses (0-1 per horse, 50% chance)
    const illnessDetails = [
      'Hafif öksürük, antibiyotik tedavisi başlatıldı',
      'Eklem ağrısı, anti-inflamatuar ilaç verildi',
      'Hafif ateş, dinlenme önerildi',
      'Deri enfeksiyonu, topikal tedavi uygulandı',
      'Sindirim sorunu, diyet değişikliği yapıldı',
    ]

    for (const horse of horses) {
      if (Math.random() > 0.5) {
        const daysAgo = Math.floor(Math.random() * 60) + 1
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - daysAgo)

        const isOngoing = Math.random() > 0.6
        const endDate = isOngoing
          ? null
          : (() => {
              const end = new Date(startDate)
              end.setDate(end.getDate() + Math.floor(Math.random() * 14) + 3)
              return end
            })()

        const detail = illnessDetails[Math.floor(Math.random() * illnessDetails.length)]

        const illness = await prisma.horseIllness.create({
          data: {
            horseId: horse.id,
            addedById: user.id,
            startDate: startDate,
            endDate: endDate,
            detail: detail,
          },
        })
        results.illnesses++

        // Add operations for resolved illnesses (50% chance)
        if (!isOngoing && Math.random() > 0.5) {
          const numOperations = Math.floor(Math.random() * 2) + 1
          for (let i = 0; i < numOperations; i++) {
            const operationDate = new Date(startDate)
            operationDate.setDate(operationDate.getDate() + (i + 1) * 2)

            await prisma.horseIllnessOperation.create({
              data: {
                illnessId: illness.id,
                addedById: user.id,
                date: operationDate,
                description: `Kontrol ve tedavi uygulaması ${i + 1}`,
              },
            })
            results.illnessOperations++
          }
        }
      }
    }

    // Generate banned medicines (0-1 per horse, 40% chance)
    const waitDaysMap: { [key: string]: number } = {
      'Phenylbutazone (Bute)': 7,
      'Flunixin Meglumine (Banamine)': 5,
      'Ketoprofen': 3,
      'Corticosteroids (Dexamethasone)': 14,
      'Antibiotics (Penicillin)': 7,
      'Diuretics (Furosemide)': 3,
    }

    for (const horse of horses) {
      if (Math.random() > 0.6) {
        const daysAgo = Math.floor(Math.random() * 30) + 1
        const givenDate = new Date(now)
        givenDate.setDate(givenDate.getDate() - daysAgo)

        const medicineName = BANNED_MEDICINES[Math.floor(Math.random() * BANNED_MEDICINES.length)]
        const waitDays = waitDaysMap[medicineName] || Math.floor(Math.random() * 10) + 3

        await prisma.horseBannedMedicine.create({
          data: {
            horseId: horse.id,
            addedById: user.id,
            medicineName: medicineName,
            givenDate: givenDate,
            waitDays: waitDays,
            note: `${medicineName} uygulandı. Yarışa katılmadan önce ${waitDays} gün beklenmesi gerekiyor.`,
          },
        })
        results.bannedMedicines++
      }
    }

    // Generate training plans (1-3 per horse, future dates)
    const distances = ['Kenter', 'Tırıs', '200', '400', '600', '800', '1000', '1200', '1400', '1600']
    const trainingNotes = [
      'Hafif tempo ile başla',
      'Orta tempo idman',
      'Hızlı tempo idman',
      'Dayanıklılık çalışması',
      'Hız çalışması',
    ]

    const racecourse = await prisma.racecourse.findFirst({
      where: { name: 'İstanbul' },
    })

    for (const horse of horses) {
      const numPlans = Math.floor(Math.random() * 3) + 1
      for (let i = 0; i < numPlans; i++) {
        const daysAhead = Math.floor(Math.random() * 14) + 1
        const planDate = new Date(now)
        planDate.setDate(planDate.getDate() + daysAhead)

        const distance = distances[Math.floor(Math.random() * distances.length)]
        const note = trainingNotes[Math.floor(Math.random() * trainingNotes.length)]

        await prisma.horseTrainingPlan.create({
          data: {
            horseId: horse.id,
            addedById: user.id,
            planDate: planDate,
            distance: distance,
            note: note,
            racecourseId: racecourse?.id,
          },
        })
        results.trainingPlans++
      }
    }

    const totalCreated =
      results.expenses +
      results.notes +
      results.illnesses +
      results.illnessOperations +
      results.bannedMedicines +
      results.trainingPlans

    console.log(
      `[Admin Generate Demo Data] Generated demo data for user ${userId}, stablemate ${stablemate.name}:`,
      results
    )

    return NextResponse.json({
      message: `Successfully generated demo data for ${user.email}`,
      stablemate: stablemate.name,
      horses: horses.length,
      created: results,
      total: totalCreated,
    })
  } catch (error: any) {
    console.error('[Admin Generate Demo Data] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate demo data', message: error.message },
      { status: 500 }
    )
  }
}

