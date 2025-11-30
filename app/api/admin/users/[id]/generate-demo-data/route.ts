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
    // - 2-3 horses: ONLY active hastalik (no banned medicine)
    // - 2-3 horses: ONLY active cikici ilac (no illness)
    // - Rest: neither
    
    // First, find horses that have run at least ONE race in the last 3 months
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    
    console.log(`[Admin Generate Demo Data] Checking for horses with races in last 3 months (since ${threeMonthsAgo.toISOString()})`)
    
    const horsesWithRecentRaces: any[] = []
    for (const horse of horses) {
      // Query to find at least one race in the last 3 months
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
        console.log(`[Admin Generate Demo Data] [OK] Horse "${horse.name}" has race on ${recentRace.raceDate.toISOString()}`)
      }
    }
    
    console.log(`[Admin Generate Demo Data] Found ${horsesWithRecentRaces.length} horse(s) with at least one race in last 3 months`)
    
    // IMPORTANT: Select at most 2 horses ONLY from those with recent races for "both" condition
    // If no horses have recent races, skip the "both" condition entirely
    let horsesWithBoth: any[] = []
    let horsesWithBothIds: string[] = []
    
    if (horsesWithRecentRaces.length > 0) {
      // CRITICAL: Only select from horsesWithRecentRaces array (horses with at least one race in last 3 months)
      const shuffledRecentRaceHorses = [...horsesWithRecentRaces].sort(() => Math.random() - 0.5)
      horsesWithBoth = shuffledRecentRaceHorses.slice(0, Math.min(2, shuffledRecentRaceHorses.length))
      horsesWithBothIds = horsesWithBoth.map(h => h.id)
      
      console.log(`[Admin Generate Demo Data] Selected ${horsesWithBoth.length} horse(s) from ${horsesWithRecentRaces.length} horses with recent races for BOTH condition`)
      
      // VERIFICATION: Double-check that selected horses actually have recent races
      for (const horse of horsesWithBoth) {
        const verifyRace = await prisma.horseRaceHistory.findFirst({
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
        
        if (!verifyRace) {
          console.error(`[Admin Generate Demo Data] [ERROR] Horse "${horse.name}" (${horse.id}) was selected for "both" but verification shows no race in last 3 months! Removing from selection.`)
          // Remove from selection if verification fails
          horsesWithBoth = horsesWithBoth.filter(h => h.id !== horse.id)
          horsesWithBothIds = horsesWithBothIds.filter(id => id !== horse.id)
        } else {
          console.log(`[Admin Generate Demo Data] [OK] Verified: Horse "${horse.name}" has race on ${verifyRace.raceDate.toISOString()}`)
        }
      }
      
      if (horsesWithBoth.length > 0) {
        console.log(`[Admin Generate Demo Data] [OK] Final selection: ${horsesWithBoth.length} horse(s) with verified races in last 3 months for BOTH condition`)
        horsesWithBoth.forEach(h => console.log(`[Admin Generate Demo Data]   - ${h.name}`))
      } else {
        console.log(`[Admin Generate Demo Data] [WARN] After verification, no valid horses remain for "both" condition`)
      }
    } else {
      console.log(`[Admin Generate Demo Data] [WARN] No horses with races in last 3 months found, skipping "both" condition entirely`)
    }
    
    // Remove horses with both from the pool for "only one" selection
    const remainingHorses = horses.filter(h => !horsesWithBothIds.includes(h.id))
    const shuffledHorses = [...remainingHorses].sort(() => Math.random() - 0.5)
    
    // Select at most 5 horses for "only one" condition (illness OR medicine, not both)
    const numHorsesWithOne = Math.min(5, shuffledHorses.length)
    const horsesWithOne = shuffledHorses.slice(0, numHorsesWithOne)
    
    // Split horses with one into two groups: illness only and banned medicine only
    // Distribute evenly or randomly between the two groups
    const shuffledForSplit = [...horsesWithOne].sort(() => Math.random() - 0.5)
    const splitPoint = Math.floor(shuffledForSplit.length / 2)
    const illnessOnlyHorses = shuffledForSplit.slice(0, splitPoint)
    const medicineOnlyHorses = shuffledForSplit.slice(splitPoint)
    
    const illnessOnlyIds = illnessOnlyHorses.map(h => h.id)
    const medicineOnlyIds = medicineOnlyHorses.map(h => h.id)
    
    console.log(`[Admin Generate Demo Data] Selected ${numHorsesWithOne} horse(s) for "only one" condition: ${illnessOnlyIds.length} illness-only, ${medicineOnlyIds.length} medicine-only`)
    console.log(`[Admin Generate Demo Data] Horses with BOTH: ${horsesWithBothIds.length} (${horsesWithBoth.map(h => h.name).join(', ')})`)
    console.log(`[Admin Generate Demo Data] Horses with ILLNESS ONLY: ${illnessOnlyIds.length} (${illnessOnlyHorses.map(h => h.name).join(', ')})`)
    console.log(`[Admin Generate Demo Data] Horses with MEDICINE ONLY: ${medicineOnlyIds.length} (${medicineOnlyHorses.map(h => h.name).join(', ')})`)
    
    // All horses that should get illness (both + illness only)
    const allIllnessHorseIds = [...horsesWithBothIds, ...illnessOnlyIds]
    // All horses that should get banned medicine (both + medicine only)
    const allMedicineHorseIds = [...horsesWithBothIds, ...medicineOnlyIds]
    
    // CRITICAL: Track which horses should NOT get anything (for verification)
    const horsesWithNothing = horses.filter(h => 
      !horsesWithBothIds.includes(h.id) && 
      !illnessOnlyIds.includes(h.id) && 
      !medicineOnlyIds.includes(h.id)
    )
    console.log(`[Admin Generate Demo Data] Horses with NOTHING: ${horsesWithNothing.length} (${horsesWithNothing.map(h => h.name).join(', ')})`)

    // CRITICAL: Delete existing illnesses and banned medicines for these horses first
    // This prevents accumulation if demo data is generated multiple times
    const horseIds = horses.map(h => h.id)
    
    // Get all illness IDs first (needed to delete operations)
    const existingIllnessIds = await prisma.horseIllness.findMany({
      where: { horseId: { in: horseIds } },
      select: { id: true },
    })
    
    // Delete illness operations first (they reference illnesses)
    if (existingIllnessIds.length > 0) {
      await prisma.horseIllnessOperation.deleteMany({
        where: { illnessId: { in: existingIllnessIds.map(i => i.id) } },
      })
    }
    
    // Delete existing illnesses and banned medicines
    await Promise.all([
      prisma.horseIllness.deleteMany({
        where: { horseId: { in: horseIds } },
      }),
      prisma.horseBannedMedicine.deleteMany({
        where: { horseId: { in: horseIds } },
      }),
    ])
    
    console.log(`[Admin Generate Demo Data] Deleted existing illnesses and banned medicines for ${horseIds.length} horses`)

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
      const shouldAddMedicine = allMedicineHorseIds.includes(horse.id)
      const needsOperations = horsesWithBothIds.includes(horse.id)
      
      // CRITICAL SAFEGUARD: Only allow both if horse is explicitly in horsesWithBothIds
      // This prevents any logic errors from adding both to wrong horses
      const isAllowedBoth = horsesWithBothIds.includes(horse.id)
      const finalShouldAddIllness = shouldAddIllness && (isAllowedBoth || !shouldAddMedicine)
      const finalShouldAddMedicine = shouldAddMedicine && (isAllowedBoth || !shouldAddIllness)
      
      // VERIFICATION: Log what we're adding to each horse
      if (finalShouldAddIllness && finalShouldAddMedicine) {
        if (!isAllowedBoth) {
          console.error(`[Admin Generate Demo Data] [ERROR] Attempted to add BOTH to horse "${horse.name}" but it's not in horsesWithBothIds! Skipping.`)
          continue
        }
        console.log(`[Admin Generate Demo Data] Adding BOTH to horse: ${horse.name} (verified in horsesWithBothIds)`)
      } else if (finalShouldAddIllness) {
        console.log(`[Admin Generate Demo Data] Adding ILLNESS ONLY to horse: ${horse.name}`)
      } else if (finalShouldAddMedicine) {
        console.log(`[Admin Generate Demo Data] Adding MEDICINE ONLY to horse: ${horse.name}`)
      } else {
        console.log(`[Admin Generate Demo Data] Adding NOTHING to horse: ${horse.name}`)
      }
      
      if (finalShouldAddIllness) {
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
      const shouldAddIllness = allIllnessHorseIds.includes(horse.id)
      const shouldAddMedicine = allMedicineHorseIds.includes(horse.id)
      
      // CRITICAL SAFEGUARD: Only allow both if horse is explicitly in horsesWithBothIds
      const isAllowedBoth = horsesWithBothIds.includes(horse.id)
      const finalShouldAddIllness = shouldAddIllness && (isAllowedBoth || !shouldAddMedicine)
      const finalShouldAddMedicine = shouldAddMedicine && (isAllowedBoth || !shouldAddIllness)
      
      if (finalShouldAddMedicine) {
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

        // Generate trainer expenses (2-3 per horse, only horse-required categories)
        // Target: ~40% of owner expenses (owner: 3-5, trainer: 2-3)
        const trainerExpenseCategories = ['ILAC', 'MONT', 'NAKLIYE']
        for (const horse of trainerHorses) {
          const numExpenses = Math.floor(Math.random() * 2) + 2
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

        // Generate trainer notes (3-4 per horse)
        // Target: ~40% of owner notes (owner: 5-7, trainer: 3-4)
        const trainerNoteTemplates = [
          'Antrenman sonrası kontrol edildi, performans iyi.',
          'Günlük idman yapıldı, at sağlıklı.',
          'Rutin bakım ve kontrol tamamlandı.',
          'Yem ve su tüketimi normal seviyede.',
          'Antrenman programına uygun şekilde çalışıldı.',
        ]
        for (const horse of trainerHorses) {
          const numNotes = Math.floor(Math.random() * 2) + 3
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

        // NOTE: Trainers do NOT create illnesses or banned medicines
        // Only owners create these to avoid conflicts and maintain clear ownership

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

    // Set horse locations based on race history
    // Horses with races in last 3 months -> "Saha" (racecourse)
    // Other horses -> "Ciftlik" (farm)
    const locationThreeMonthsAgo = new Date()
    locationThreeMonthsAgo.setMonth(locationThreeMonthsAgo.getMonth() - 3)

    const locationRacecourse = await prisma.racecourse.findFirst({
      where: { name: { contains: 'İstanbul', mode: 'insensitive' } },
    })

    const locationFarm = await prisma.farm.findFirst()

    let sahaCount = 0
    let ciftlikCount = 0

    for (const horse of horses) {
      // Check if horse has a race in the last 3 months
      const recentRace = await prisma.horseRaceHistory.findFirst({
        where: {
          horseId: horse.id,
          raceDate: {
            gte: locationThreeMonthsAgo,
          },
        },
        orderBy: {
          raceDate: 'desc',
        },
      })

      const hasRecentRace = !!recentRace

      if (hasRecentRace) {
        // Set to "Saha" (racecourse)
        if (locationRacecourse) {
          await prisma.horseLocationHistory.create({
            data: {
              horseId: horse.id,
              locationType: 'racecourse',
              city: locationRacecourse.name,
              racecourseId: locationRacecourse.id,
              farmId: null,
              startDate: new Date(),
              endDate: null,
            },
          })

          await prisma.horse.update({
            where: { id: horse.id },
            data: {
              racecourseId: locationRacecourse.id,
              farmId: null,
            },
          })
        } else {
          // Still set locationType even if no racecourse found
          await prisma.horseLocationHistory.create({
            data: {
              horseId: horse.id,
              locationType: 'racecourse',
              city: 'İstanbul',
              racecourseId: null,
              farmId: null,
              startDate: new Date(),
              endDate: null,
            },
          })
        }
        sahaCount++
      } else {
        // Set to "Ciftlik" (farm)
        if (locationFarm) {
          await prisma.horseLocationHistory.create({
            data: {
              horseId: horse.id,
              locationType: 'farm',
              city: locationFarm.city || '',
              racecourseId: null,
              farmId: locationFarm.id,
              startDate: new Date(),
              endDate: null,
            },
          })

          await prisma.horse.update({
            where: { id: horse.id },
            data: {
              farmId: locationFarm.id,
              racecourseId: null,
            },
          })
        } else {
          // Still set locationType even if no farm found
          await prisma.horseLocationHistory.create({
            data: {
              horseId: horse.id,
              locationType: 'farm',
              city: 'Ankara',
              racecourseId: null,
              farmId: null,
              startDate: new Date(),
              endDate: null,
            },
          })
        }
        ciftlikCount++
      }
    }

    console.log(`[Admin Generate Demo Data] Set ${sahaCount} horses to "Saha" (racecourse)`)
    console.log(`[Admin Generate Demo Data] Set ${ciftlikCount} horses to "Ciftlik" (farm)`)

    const totalCreated =
      results.expenses +
      results.notes +
      results.illnesses +
      results.illnessOperations +
      results.bannedMedicines +
      results.trainingPlans +
      results.trainerExpenses +
      results.trainerNotes +
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

