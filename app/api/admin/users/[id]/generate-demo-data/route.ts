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
  'SIGORTA',
  'MONT',
  'NAL_NALBANT',
  'SARAC',
] as const

// Categories that require horse assignment
const HORSE_REQUIRED_CATEGORIES = ['ILAC', 'MONT', 'NAKLIYE'] as const

// Categories that are stablemate-level (no horse assignment)
const STABLEMATE_CATEGORIES = EXPENSE_CATEGORIES.filter(
  (cat) => !HORSE_REQUIRED_CATEGORIES.includes(cat as any)
)

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
    'SIGORTA': 'Sigorta giderleri',
    'MONT': 'Mont giderleri',
    'NAL_NALBANT': 'Nal ve nalbant giderleri',
    'SARAC': 'Saraç giderleri',
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
      trainerExpenses: 0,
      trainerNotes: 0,
      trainerIllnesses: 0,
      trainerBannedMedicines: 0,
      trainerTrainingPlans: 0,
    }

    // Common wait days for different medicine types (used for both owner and trainer)
    const waitDaysMap: { [key: string]: number } = {
      'Phenylbutazone (Bute)': 7,
      'Flunixin Meglumine (Banamine)': 5,
      'Ketoprofen': 3,
      'Corticosteroids (Dexamethasone)': 14,
      'Antibiotics (Penicillin)': 7,
      'Diuretics (Furosemide)': 3,
    }

    // 1. Generate 3-5 expenses per horse (only from horse-required categories)
    for (const horse of horses) {
      const numExpenses = Math.floor(Math.random() * 3) + 3 // 3-5 expenses
      for (let i = 0; i < numExpenses; i++) {
        const daysAgo = Math.floor(Math.random() * 30) + 1
        const expenseDate = new Date(now)
        expenseDate.setDate(expenseDate.getDate() - daysAgo)

        // Only use horse-required categories
        const category = HORSE_REQUIRED_CATEGORIES[Math.floor(Math.random() * HORSE_REQUIRED_CATEGORIES.length)]
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

    // 2. Generate 2-3 expenses for each stablemate-level category
    for (const category of STABLEMATE_CATEGORIES) {
      const numExpenses = Math.floor(Math.random() * 2) + 2 // 2-3 expenses per category
      for (let i = 0; i < numExpenses; i++) {
        const daysAgo = Math.floor(Math.random() * 30) + 1
        const expenseDate = new Date(now)
        expenseDate.setDate(expenseDate.getDate() - daysAgo)

        const amount = Math.floor(Math.random() * 5000) + 500 // 500-5500 TRY
        const description = getExpenseDescription(category)

        // horseId is NULL for stablemate-level expenses
        await prisma.expense.create({
          data: {
            horseId: null,
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

    // Distribution strategy:
    // - At most 2 horses: both active hastalik + active cikici ilac (with operations on illnesses)
    //   These MUST be horses with races in the last 3 months
    // - 3-5 horses: only one of them (either hastalik OR cikici ilac, but not both)
    // - Rest: neither
    
    // First, find horses with races in the last 3 months
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    
    const horsesWithRecentRaces: any[] = []
    for (const horse of horses) {
      const recentRace = await prisma.horseRaceHistory.findFirst({
        where: {
          horseId: horse.id,
          raceDate: {
            gte: threeMonthsAgo,
          },
        },
        orderBy: {
          raceDate: 'desc',
        },
      })
      
      if (recentRace) {
        horsesWithRecentRaces.push(horse)
      }
    }
    
    // Select at most 2 horses from those with recent races for both
    const shuffledRecentRaceHorses = [...horsesWithRecentRaces].sort(() => Math.random() - 0.5)
    const horsesWithBoth = shuffledRecentRaceHorses.slice(0, Math.min(2, shuffledRecentRaceHorses.length))
    const horsesWithBothIds = horsesWithBoth.map(h => h.id)
    
    // Remove horses with both from the pool for "only one" selection
    const remainingHorses = horses.filter(h => !horsesWithBothIds.includes(h.id))
    const shuffledHorses = [...remainingHorses].sort(() => Math.random() - 0.5)
    
    // Select 3-5 horses for only one (either illness OR banned medicine)
    const numHorsesWithOne = Math.min(Math.floor(Math.random() * 3) + 3, shuffledHorses.length)
    const horsesWithOne = shuffledHorses.slice(0, numHorsesWithOne)
    
    // Split horses with one into two groups: illness only and banned medicine only
    const illnessOnlyHorses = horsesWithOne.slice(0, Math.floor(horsesWithOne.length / 2))
    const medicineOnlyHorses = horsesWithOne.slice(Math.floor(horsesWithOne.length / 2))
    
    const illnessOnlyIds = illnessOnlyHorses.map(h => h.id)
    const medicineOnlyIds = medicineOnlyHorses.map(h => h.id)
    
    // All horses that should get illness (both + illness only)
    const allIllnessHorseIds = [...horsesWithBothIds, ...illnessOnlyIds]
    // All horses that should get banned medicine (both + medicine only)
    const allMedicineHorseIds = [...horsesWithBothIds, ...medicineOnlyIds]

    // Generate illnesses (0-1 per horse) - ALL ACTIVE (no endDate)
    const illnessDetails = [
      'Hafif öksürük, antibiyotik tedavisi başlatıldı',
      'Eklem ağrısı, anti-inflamatuar ilaç verildi',
      'Hafif ateş, dinlenme önerildi',
      'Deri enfeksiyonu, topikal tedavi uygulandı',
      'Sindirim sorunu, diyet değişikliği yapıldı',
    ]

    for (const horse of horses) {
      const shouldAddIllness = allIllnessHorseIds.includes(horse.id)
      const needsOperations = horsesWithBothIds.includes(horse.id)
      
      if (shouldAddIllness) {
        const daysAgo = Math.floor(Math.random() * 60) + 1
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - daysAgo)

        // ALL illnesses should be active (no endDate) - user requested only active ones
        const endDate = null
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

        // Horses with both always get operations; others may or may not
        const hasOperations = needsOperations || Math.random() > 0.5
        if (hasOperations) {
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

    // Generate banned medicines (0-1 per horse) - ALL ACTIVE (remainingDays > 0)
    for (const horse of horses) {
      const shouldAddMedicine = allMedicineHorseIds.includes(horse.id)
      
      if (shouldAddMedicine) {
        const medicineName = BANNED_MEDICINES[Math.floor(Math.random() * BANNED_MEDICINES.length)]
        const waitDays = waitDaysMap[medicineName] || Math.floor(Math.random() * 10) + 3
        
        // ALL banned medicines should be active (remainingDays > 0) - user requested only active ones
        // Give medicine recently enough that it's still active (daysAgo < waitDays)
        const daysAgo = Math.floor(Math.random() * (waitDays - 1)) + 1  // Ensure remainingDays > 0
        const givenDate = new Date(now)
        givenDate.setDate(givenDate.getDate() - daysAgo)

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

    // Generate trainer-created data
    const stablemateTrainers = await prisma.stablemateTrainer.findMany({
      where: {
        stablemateId: stablemate.id,
        trainerProfileId: { not: null },
        isActive: true,
      },
      include: {
        trainerProfile: {
          include: {
            user: true,
          },
        },
      },
    })

    if (stablemateTrainers.length > 0) {
      console.log(`[Admin Generate Demo Data] Found ${stablemateTrainers.length} trainer(s) linked to stablemate`)

      for (const stablemateTrainer of stablemateTrainers) {
        if (!stablemateTrainer.trainerProfile || !stablemateTrainer.trainerProfile.user) {
          continue
        }

        const trainer = stablemateTrainer.trainerProfile
        const trainerUser = trainer.user
        const trainerId = trainer.id

        // Get horses assigned to this trainer
        const assignedHorses = horses.filter(h => h.trainerId === trainerId)
        
        // If no horses directly assigned, use a subset of stablemate horses
        const trainerHorses = assignedHorses.length > 0 
          ? assignedHorses 
          : horses.slice(0, Math.max(1, Math.floor(horses.length * 0.6)))

        if (trainerHorses.length === 0) {
          continue
        }

        // Generate trainer expenses (1-2 per horse, only horse-required categories)
        const trainerExpenseCategories = ['ILAC', 'MONT', 'NAKLIYE']
        for (const horse of trainerHorses) {
          const numExpenses = Math.floor(Math.random() * 2) + 1
          for (let i = 0; i < numExpenses; i++) {
            const daysAgo = Math.floor(Math.random() * 30) + 1
            const expenseDate = new Date(now)
            expenseDate.setDate(expenseDate.getDate() - daysAgo)
            const category = trainerExpenseCategories[Math.floor(Math.random() * trainerExpenseCategories.length)]
            const amount = Math.floor(Math.random() * 5000) + 500

            await prisma.expense.create({
              data: {
                horseId: horse.id,
                addedById: trainerUser.id,
                date: expenseDate,
                category: category as any,
                amount: amount,
                currency: 'TRY',
                note: getExpenseDescription(category),
              },
            })
            results.trainerExpenses++
          }
        }

        // Generate trainer notes (1-2 per horse)
        const trainerNoteTemplates = [
          'Antrenman sonrası kontrol edildi, performans iyi.',
          'Günlük idman yapıldı, at sağlıklı.',
          'Rutin bakım ve kontrol tamamlandı.',
          'Yem ve su tüketimi normal seviyede.',
          'Antrenman programına uygun şekilde çalışıldı.',
        ]
        for (const horse of trainerHorses) {
          const numNotes = Math.floor(Math.random() * 2) + 1
          for (let i = 0; i < numNotes; i++) {
            const daysAgo = Math.floor(Math.random() * 14) + 1
            const noteDate = new Date(now)
            noteDate.setDate(noteDate.getDate() - daysAgo)
            const noteText = trainerNoteTemplates[Math.floor(Math.random() * trainerNoteTemplates.length)]

            await prisma.horseNote.create({
              data: {
                horseId: horse.id,
                addedById: trainerUser.id,
                date: noteDate,
                note: noteText,
              },
            })
            results.trainerNotes++
          }
        }

        // Generate trainer illnesses (0-1 per horse, all active)
        const trainerIllnessDetails = [
          'Hafif öksürük gözlemlendi, takip ediliyor',
          'Eklem hassasiyeti, hafif egzersiz yapıldı',
          'Deri tahrişi, topikal tedavi uygulandı',
        ]
        for (const horse of trainerHorses) {
          if (Math.random() > 0.7) { // 30% chance
            const daysAgo = Math.floor(Math.random() * 30) + 1
            const startDate = new Date(now)
            startDate.setDate(startDate.getDate() - daysAgo)
            const detail = trainerIllnessDetails[Math.floor(Math.random() * trainerIllnessDetails.length)]

            await prisma.horseIllness.create({
              data: {
                horseId: horse.id,
                addedById: trainerUser.id,
                startDate: startDate,
                endDate: null,
                detail: detail,
              },
            })
            results.trainerIllnesses++
          }
        }

        // Generate trainer banned medicines (0-1 per horse, all active)
        for (const horse of trainerHorses) {
          if (Math.random() > 0.7) { // 30% chance
            const medicineName = BANNED_MEDICINES[Math.floor(Math.random() * BANNED_MEDICINES.length)]
            const waitDays = waitDaysMap[medicineName] || Math.floor(Math.random() * 10) + 3
            const daysAgo = Math.floor(Math.random() * (waitDays - 1)) + 1
            const givenDate = new Date(now)
            givenDate.setDate(givenDate.getDate() - daysAgo)

            await prisma.horseBannedMedicine.create({
              data: {
                horseId: horse.id,
                addedById: trainerUser.id,
                medicineName: medicineName,
                givenDate: givenDate,
                waitDays: waitDays,
                note: `${medicineName} uygulandı. Yarışa katılmadan önce ${waitDays} gün beklenmesi gerekiyor.`,
              },
            })
            results.trainerBannedMedicines++
          }
        }

        // Generate trainer training plans (2-4 per horse, future dates)
        for (const horse of trainerHorses) {
          const numPlans = Math.floor(Math.random() * 3) + 2
          for (let i = 0; i < numPlans; i++) {
            const daysAhead = Math.floor(Math.random() * 14) + 1
            const planDate = new Date(now)
            planDate.setDate(planDate.getDate() + daysAhead)
            const distance = distances[Math.floor(Math.random() * distances.length)]
            const note = trainingNotes[Math.floor(Math.random() * trainingNotes.length)]

            await prisma.horseTrainingPlan.create({
              data: {
                horseId: horse.id,
                addedById: trainerUser.id,
                planDate: planDate,
                distance: distance,
                note: note,
                racecourseId: racecourse?.id,
              },
            })
            results.trainerTrainingPlans++
          }
        }
      }
    }

    const totalCreated =
      results.expenses +
      results.notes +
      results.illnesses +
      results.illnessOperations +
      results.bannedMedicines +
      results.trainingPlans +
      results.trainerExpenses +
      results.trainerNotes +
      results.trainerIllnesses +
      results.trainerBannedMedicines +
      results.trainerTrainingPlans

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

