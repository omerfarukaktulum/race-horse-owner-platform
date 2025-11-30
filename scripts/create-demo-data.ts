import { PrismaClient } from '@prisma/client'
import { BANNED_MEDICINES } from '../lib/constants/banned-medicines'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// User email to generate data for
const USER_EMAIL = 'omerfaruk.aktulum@gmail.com'

// SQL output file
const SQL_OUTPUT_FILE = path.join(__dirname, '../prisma/demo-data.sql')

// SQL statements array
const sqlStatements: string[] = []

// Helper function to escape SQL strings
function escapeSql(str: string | null | undefined): string {
  if (!str) return 'NULL'
  return `'${str.replace(/'/g, "''")}'`
}

// Helper function to format dates for SQL
function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19)
}

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
 * Get user and their horses
 */
async function getUserAndHorses() {
  console.log(`\nFinding user: ${USER_EMAIL}`)
  
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL },
    include: {
      ownerProfile: {
        include: {
          stablemate: {
            include: {
              horses: {
                include: {
                  raceHistory: {
                    where: {
                      raceDate: {
                        gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
                      },
                    },
                    orderBy: {
                      raceDate: 'desc',
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!user) {
    throw new Error(`User not found: ${USER_EMAIL}`)
  }

  if (!user.ownerProfile) {
    throw new Error(`User does not have an owner profile: ${USER_EMAIL}`)
  }

  if (!user.ownerProfile.stablemate) {
    throw new Error(`User does not have a stablemate: ${USER_EMAIL}`)
  }

  const horses = user.ownerProfile.stablemate.horses

  console.log(`  [OK] Found user: ${user.email}`)
  console.log(`  [OK] Found stablemate: ${user.ownerProfile.stablemate.name}`)
  console.log(`  [OK] Found ${horses.length} horses`)

  return { user, horses }
}

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
 * Add sample expenses to horses
 */
async function addExpenses(horses: any[], ownerUser: any, stablemateId: string) {
  console.log(`\nGenerating expenses SQL...`)

  const now = new Date()
  const expenses = []
  let horseExpenseCount = 0
  let stablemateExpenseCount = 0

  // 1. Create 3-5 expenses per horse (only from horse-required categories)
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

      const sql = `INSERT INTO expenses (id, "horseId", "addedById", date, category, amount, currency, note, "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, ${escapeSql(ownerUser.id)}, '${formatDate(expenseDate)}', '${category}', '${amount}', 'TRY', ${escapeSql(description)}, NOW(), NOW());`
      
      sqlStatements.push(sql)
      expenses.push({ id: 'generated', horseId: horse.id })
      horseExpenseCount++
    }
  }

  // 2. Create 2-3 expenses for each stablemate-level category
  for (const category of STABLEMATE_CATEGORIES) {
    const numExpenses = Math.floor(Math.random() * 2) + 2 // 2-3 expenses per category

    for (let i = 0; i < numExpenses; i++) {
      const daysAgo = Math.floor(Math.random() * 30) + 1
      const expenseDate = new Date(now)
      expenseDate.setDate(expenseDate.getDate() - daysAgo)

      const amount = Math.floor(Math.random() * 5000) + 500 // 500-5500 TRY
      const description = getExpenseDescription(category)

      // horseId is NULL for stablemate-level expenses
      const sql = `INSERT INTO expenses (id, "horseId", "addedById", date, category, amount, currency, note, "createdAt", "updatedAt") VALUES (gen_random_uuid(), NULL, ${escapeSql(ownerUser.id)}, '${formatDate(expenseDate)}', '${category}', '${amount}', 'TRY', ${escapeSql(description)}, NOW(), NOW());`
      
      sqlStatements.push(sql)
      expenses.push({ id: 'generated', horseId: null })
      stablemateExpenseCount++
    }
  }

  console.log(`  [OK] Generated ${horseExpenseCount} horse-specific expenses`)
  console.log(`  [OK] Generated ${stablemateExpenseCount} stablemate-level expenses`)
  console.log(`  [OK] Total: ${expenses.length} expense SQL statements`)
  return expenses
}

/**
 * Add sample notes to horses
 */
async function addNotes(horses: any[], ownerUser: any) {
  console.log(`\nGenerating notes SQL...`)

  const now = new Date()
  const notes = []

  const noteTemplates = [
    'At sağlıklı görünüyor, iştahı yerinde.',
    'Günlük gezinti yapıldı, herhangi bir sorun yok.',
    'Rutin sağlık kontrolü yapıldı, normal.',
    'Yem takibi yapıldı, miktar normal seviyede.',
    'Antrenman sonrası kontrol edildi, her şey yolunda.',
  ]

  for (const horse of horses) {
    // Add 5-7 notes per horse
    const numNotes = Math.floor(Math.random() * 3) + 5

    for (let i = 0; i < numNotes; i++) {
      const daysAgo = Math.floor(Math.random() * 14) + 1
      const noteDate = new Date(now)
      noteDate.setDate(noteDate.getDate() - daysAgo)

      const noteText = noteTemplates[Math.floor(Math.random() * noteTemplates.length)]

      const sql = `INSERT INTO horse_notes (id, "horseId", "addedById", date, note, "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, ${escapeSql(ownerUser.id)}, '${formatDate(noteDate)}', ${escapeSql(noteText)}, NOW(), NOW());`
      
      sqlStatements.push(sql)
      notes.push({ id: 'generated', horseId: horse.id })
    }
  }

  console.log(`  [OK] Generated ${notes.length} note SQL statements`)
  return notes
}

/**
 * Add sample illnesses to horses
 */
async function addIllnesses(horses: any[], ownerUser: any, horseIdsToAdd: string[] = [], horsesWithOperationsIds: string[] = []) {
  console.log(`\nGenerating illnesses SQL...`)

  const now = new Date()
  const illnesses = []

  const illnessDetails = [
    'Hafif öksürük, antibiyotik tedavisi başlatıldı',
    'Eklem ağrısı, anti-inflamatuar ilaç verildi',
    'Hafif ateş, dinlenme önerildi',
    'Deri enfeksiyonu, topikal tedavi uygulandı',
    'Sindirim sorunu, diyet değişikliği yapıldı',
  ]

  for (const horse of horses) {
    const shouldAddIllness = horseIdsToAdd.includes(horse.id)
    
    if (shouldAddIllness) {
      const daysAgo = Math.floor(Math.random() * 60) + 1
      const startDate = new Date(now)
      startDate.setDate(startDate.getDate() - daysAgo)

      // ALL illnesses should be active (no endDate) - user requested only active ones
      const endDate = null

      const detail = illnessDetails[Math.floor(Math.random() * illnessDetails.length)]
      // If horse is in horsesWithOperationsIds, always add operations; otherwise random
      const needsOperations = horsesWithOperationsIds.includes(horse.id)
      const hasOperations = needsOperations || Math.random() > 0.5
      const numOperations = hasOperations ? Math.floor(Math.random() * 2) + 1 : 0

      // Insert illness first
      const illnessSql = `INSERT INTO horse_illnesses (id, "horseId", "addedById", "startDate", "endDate", detail, "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, ${escapeSql(ownerUser.id)}, '${formatDate(startDate)}', ${endDate ? `'${formatDate(endDate)}'` : 'NULL'}, ${escapeSql(detail)}, NOW(), NOW());`
      sqlStatements.push(illnessSql)

      // Add operations using a subquery to get the latest illness ID for this horse
      if (hasOperations && numOperations > 0) {
        for (let i = 0; i < numOperations; i++) {
          const operationDate = new Date(startDate)
          operationDate.setDate(operationDate.getDate() + (i + 1) * 2)
          
          const operationSql = `INSERT INTO horse_illness_operations (id, "illnessId", "addedById", date, description, "createdAt", "updatedAt") 
SELECT gen_random_uuid(), id, ${escapeSql(ownerUser.id)}, '${formatDate(operationDate)}', ${escapeSql(`Kontrol ve tedavi uygulaması ${i + 1}`)}, NOW(), NOW() 
FROM horse_illnesses 
WHERE "horseId" = ${escapeSql(horse.id)} 
ORDER BY "createdAt" DESC 
LIMIT 1;`
          
          sqlStatements.push(operationSql)
        }
      }

      illnesses.push({ id: 'generated', horseId: horse.id })
    }
  }

  console.log(`  [OK] Generated ${illnesses.length} illness SQL statements`)
  return illnesses
}

/**
 * Add sample banned medicines to horses
 */
async function addBannedMedicines(horses: any[], ownerUser: any, horseIdsToAdd: string[] = [], horsesWithBothIds: string[] = []) {
  console.log(`\nGenerating banned medicines SQL...`)

  const now = new Date()
  const medicines = []

  // Common wait days for different medicine types
  const waitDaysMap: { [key: string]: number } = {
    'Phenylbutazone (Bute)': 7,
    'Flunixin Meglumine (Banamine)': 5,
    'Ketoprofen': 3,
    'Corticosteroids (Dexamethasone)': 14,
    'Antibiotics (Penicillin)': 7,
    'Diuretics (Furosemide)': 3,
  }

  for (const horse of horses) {
    const shouldAddMedicine = horseIdsToAdd.includes(horse.id)
    
    // CRITICAL SAFEGUARD: Only allow both if horse is explicitly in horsesWithBothIds
    const isAllowedBoth = horsesWithBothIds.includes(horse.id)
    
    if (shouldAddMedicine) {
      // Additional safeguard: if this horse should get medicine but is not in horsesWithBothIds,
      // verify it's not getting both (this should be caught by the logic, but double-check)
      if (!isAllowedBoth) {
        // This is fine - it means it's medicine-only
      }
      const medicineName = BANNED_MEDICINES[Math.floor(Math.random() * BANNED_MEDICINES.length)]
      const waitDays = waitDaysMap[medicineName] || Math.floor(Math.random() * 10) + 3
      
      // ALL banned medicines should be active (remainingDays > 0) - user requested only active ones
      // Give medicine recently enough that it's still active (daysAgo < waitDays)
      const daysAgo = Math.floor(Math.random() * (waitDays - 1)) + 1  // Ensure remainingDays > 0
      const givenDate = new Date(now)
      givenDate.setDate(givenDate.getDate() - daysAgo)

      const sql = `INSERT INTO horse_banned_medicines (id, "horseId", "addedById", "medicineName", "givenDate", "waitDays", note, "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, ${escapeSql(ownerUser.id)}, ${escapeSql(medicineName)}, '${formatDate(givenDate)}', ${waitDays}, ${escapeSql(`${medicineName} uygulandı. Yarışa katılmadan önce ${waitDays} gün beklenmesi gerekiyor.`)}, NOW(), NOW());`
      
      sqlStatements.push(sql)
      medicines.push({ id: 'generated', horseId: horse.id })
    }
  }

  console.log(`  [OK] Generated ${medicines.length} banned medicine SQL statements`)
  return medicines
}

/**
 * Add sample training plans to horses
 */
async function addTrainingPlans(horses: any[], ownerUser: any) {
  console.log(`\nGenerating training plans SQL...`)

  const now = new Date()
  const plans = []

  const distances = ['Kenter', 'Tırıs', '200', '400', '600', '800', '1000', '1200', '1400', '1600']
  const trainingNotes = [
    'Hafif tempo ile başla',
    'Orta tempo idman',
    'Hızlı tempo idman',
    'Dayanıklılık çalışması',
    'Hız çalışması',
  ]

  // Get a racecourse for training plans
  const racecourse = await prisma.racecourse.findFirst({
    where: { name: 'İstanbul' },
  })

  for (const horse of horses) {
    // Add 1-3 training plans per horse (future dates)
    const numPlans = Math.floor(Math.random() * 3) + 1

    for (let i = 0; i < numPlans; i++) {
      const daysAhead = Math.floor(Math.random() * 14) + 1
      const planDate = new Date(now)
      planDate.setDate(planDate.getDate() + daysAhead)

      const distance = distances[Math.floor(Math.random() * distances.length)]
      const note = trainingNotes[Math.floor(Math.random() * trainingNotes.length)]

      const sql = `INSERT INTO horse_training_plans (id, "horseId", "addedById", "planDate", distance, note, "racecourseId", "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, ${escapeSql(ownerUser.id)}, '${formatDate(planDate)}', ${escapeSql(distance)}, ${escapeSql(note)}, ${racecourse ? escapeSql(racecourse.id) : 'NULL'}, NOW(), NOW());`
      
      sqlStatements.push(sql)
      plans.push({ id: 'generated', horseId: horse.id })
    }
  }

  console.log(`  [OK] Generated ${plans.length} training plan SQL statements`)
  return plans
}

/**
 * Set horse locations based on race history
 * Horses with races in last 3 months -> "Saha" (racecourse)
 * Other horses -> "Ciftlik" (farm)
 */
async function setHorseLocations(horses: any[]) {
  console.log(`\nSetting horse locations SQL...`)

  const now = new Date()
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  // Get a racecourse for "Saha" horses
  const racecourse = await prisma.racecourse.findFirst({
    where: { name: { contains: 'İstanbul', mode: 'insensitive' } },
  })

  // Get a farm for "Ciftlik" horses
  const farm = await prisma.farm.findFirst()

  if (!racecourse) {
    console.log('  [WARN] No racecourse found, skipping location setup for "Saha" horses')
  }
  if (!farm) {
    console.log('  [WARN] No farm found, skipping location setup for "Ciftlik" horses')
  }

  let sahaCount = 0
  let ciftlikCount = 0

  for (const horse of horses) {
    // Check if horse has a race in the last 3 months by querying database directly
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

    const hasRecentRace = !!recentRace

    if (hasRecentRace) {
      // Set to "Saha" (racecourse)
      if (racecourse) {
        const locationSql = `INSERT INTO horse_location_history (id, "horseId", "locationType", city, "racecourseId", "farmId", "startDate", "endDate", "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, 'racecourse', ${escapeSql(racecourse.name)}, ${escapeSql(racecourse.id)}, NULL, NOW(), NULL, NOW(), NOW());`
        sqlStatements.push(locationSql)
        
        // Update horse's racecourseId
        const updateHorseSql = `UPDATE horses SET "racecourseId" = ${escapeSql(racecourse.id)}, "farmId" = NULL WHERE id = ${escapeSql(horse.id)};`
        sqlStatements.push(updateHorseSql)
      } else {
        // Still set locationType even if no racecourse found
        const locationSql = `INSERT INTO horse_location_history (id, "horseId", "locationType", city, "racecourseId", "farmId", "startDate", "endDate", "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, 'racecourse', 'İstanbul', NULL, NULL, NOW(), NULL, NOW(), NOW());`
        sqlStatements.push(locationSql)
      }
      
      console.log(`    [OK] Set "${horse.name}" to Saha (has race in last 3 months)`)
      sahaCount++
    } else {
      // Set to "Ciftlik" (farm)
      if (farm) {
        const locationSql = `INSERT INTO horse_location_history (id, "horseId", "locationType", city, "racecourseId", "farmId", "startDate", "endDate", "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, 'farm', ${escapeSql(farm.city || '')}, NULL, ${escapeSql(farm.id)}, NOW(), NULL, NOW(), NOW());`
        sqlStatements.push(locationSql)
        
        // Update horse's farmId
        const updateHorseSql = `UPDATE horses SET "farmId" = ${escapeSql(farm.id)}, "racecourseId" = NULL WHERE id = ${escapeSql(horse.id)};`
        sqlStatements.push(updateHorseSql)
      } else {
        // Still set locationType even if no farm found
        const locationSql = `INSERT INTO horse_location_history (id, "horseId", "locationType", city, "racecourseId", "farmId", "startDate", "endDate", "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, 'farm', 'Ankara', NULL, NULL, NOW(), NULL, NOW(), NOW());`
        sqlStatements.push(locationSql)
      }
      
      console.log(`    [OK] Set "${horse.name}" to Ciftlik (no race in last 3 months)`)
      ciftlikCount++
    }
  }

  console.log(`  [OK] Set ${sahaCount} horses to "Saha" (racecourse)`)
  console.log(`  [OK] Set ${ciftlikCount} horses to "Ciftlik" (farm)`)
  console.log(`  [OK] Total: ${sahaCount + ciftlikCount} location SQL statements`)
}

/**
 * Add trainer-created data (expenses, notes, illnesses, banned medicines, training plans)
 */
async function addTrainerData(horses: any[], stablemateId: string, allIllnessHorseIds: string[] = [], allMedicineHorseIds: string[] = []) {
  console.log(`\nGenerating trainer-created data SQL...`)

  // Find trainers linked to this stablemate
  const stablemateTrainers = await prisma.stablemateTrainer.findMany({
    where: {
      stablemateId: stablemateId,
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

  if (stablemateTrainers.length === 0) {
    console.log(`  [WARN] No active trainers found for this stablemate, skipping trainer data`)
    return
  }

  console.log(`  [OK] Found ${stablemateTrainers.length} trainer(s) linked to stablemate`)

  // For each trainer, find horses they can access
  for (const stablemateTrainer of stablemateTrainers) {
    if (!stablemateTrainer.trainerProfile || !stablemateTrainer.trainerProfile.user) {
      continue
    }

    const trainer = stablemateTrainer.trainerProfile
    const trainerUser = trainer.user
    const trainerId = trainer.id

    // Get horses assigned to this trainer
    const assignedHorses = horses.filter(h => h.trainerId === trainerId)
    
    // If no horses directly assigned, use a subset of stablemate horses (trainers can work with any horse in their stablemate)
    const trainerHorses = assignedHorses.length > 0 
      ? assignedHorses 
      : horses.slice(0, Math.max(1, Math.floor(horses.length * 0.6))) // Use up to 60% of horses

    if (trainerHorses.length === 0) {
      console.log(`    [WARN] No horses available for trainer "${trainer.fullName}", skipping`)
      continue
    }

    console.log(`    📋 Trainer: ${trainer.fullName} (${trainerHorses.length} horse(s))`)

    // Generate trainer expenses (2-3 per horse, only horse-required categories)
    // Target: ~40% of owner expenses (owner: 3-5, trainer: 2-3)
    const trainerExpenseCategories = ['ILAC', 'MONT', 'NAKLIYE']
    let trainerExpenseCount = 0
    for (const horse of trainerHorses) {
      const numExpenses = Math.floor(Math.random() * 2) + 2 // 2-3 expenses
      for (let i = 0; i < numExpenses; i++) {
        const daysAgo = Math.floor(Math.random() * 30) + 1
        const expenseDate = new Date()
        expenseDate.setDate(expenseDate.getDate() - daysAgo)
        const category = trainerExpenseCategories[Math.floor(Math.random() * trainerExpenseCategories.length)]
        const amount = Math.floor(Math.random() * 5000) + 500
        const description = getExpenseDescription(category)

        const sql = `INSERT INTO expenses (id, "horseId", "addedById", date, category, amount, currency, note, "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, ${escapeSql(trainerUser.id)}, '${formatDate(expenseDate)}', '${category}', '${amount}', 'TRY', ${escapeSql(description)}, NOW(), NOW());`
        sqlStatements.push(sql)
        trainerExpenseCount++
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
    let trainerNoteCount = 0
    for (const horse of trainerHorses) {
      const numNotes = Math.floor(Math.random() * 2) + 3 // 3-4 notes
      for (let i = 0; i < numNotes; i++) {
        const daysAgo = Math.floor(Math.random() * 14) + 1
        const noteDate = new Date()
        noteDate.setDate(noteDate.getDate() - daysAgo)
        const noteText = trainerNoteTemplates[Math.floor(Math.random() * trainerNoteTemplates.length)]

        const sql = `INSERT INTO horse_notes (id, "horseId", "addedById", date, note, "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, ${escapeSql(trainerUser.id)}, '${formatDate(noteDate)}', ${escapeSql(noteText)}, NOW(), NOW());`
        sqlStatements.push(sql)
        trainerNoteCount++
      }
    }

    // Generate trainer illnesses and banned medicines
    // IMPORTANT: Trainers should NOT add both to the same horse
    // Only add one or the other, or neither, to avoid conflicts with owner data
    const trainerIllnessDetails = [
      'Hafif öksürük gözlemlendi, takip ediliyor',
      'Eklem hassasiyeti, hafif egzersiz yapıldı',
      'Deri tahrişi, topikal tedavi uygulandı',
    ]
    const waitDaysMap: { [key: string]: number } = {
      'Phenylbutazone (Bute)': 7,
      'Flunixin Meglumine (Banamine)': 5,
      'Ketoprofen': 3,
      'Corticosteroids (Dexamethasone)': 14,
      'Antibiotics (Penicillin)': 7,
      'Diuretics (Furosemide)': 3,
    }
    
    let trainerIllnessCount = 0
    let trainerMedicineCount = 0
    
    for (const horse of trainerHorses) {
      // Check if owner already added illness or medicine to this horse
      const ownerAddedIllness = allIllnessHorseIds.includes(horse.id)
      const ownerAddedMedicine = allMedicineHorseIds.includes(horse.id)
      
      // If owner already added both, skip trainer additions for this horse
      if (ownerAddedIllness && ownerAddedMedicine) {
        continue
      }
      
      // If owner added only illness, trainer can add medicine (but not illness)
      // If owner added only medicine, trainer can add illness (but not medicine)
      // If owner added nothing, trainer can add either (but not both)
      
      const random = Math.random()
      if (ownerAddedIllness && !ownerAddedMedicine) {
        // Owner has illness, trainer can add medicine
        if (random > 0.5) {
          const medicineName = BANNED_MEDICINES[Math.floor(Math.random() * BANNED_MEDICINES.length)]
          const waitDays = waitDaysMap[medicineName] || Math.floor(Math.random() * 10) + 3
          const daysAgo = Math.floor(Math.random() * (waitDays - 1)) + 1
          const givenDate = new Date()
          givenDate.setDate(givenDate.getDate() - daysAgo)

          const sql = `INSERT INTO horse_banned_medicines (id, "horseId", "addedById", "medicineName", "givenDate", "waitDays", note, "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, ${escapeSql(trainerUser.id)}, ${escapeSql(medicineName)}, '${formatDate(givenDate)}', ${waitDays}, ${escapeSql(`${medicineName} uygulandı. Yarışa katılmadan önce ${waitDays} gün beklenmesi gerekiyor.`)}, NOW(), NOW());`
          sqlStatements.push(sql)
          trainerMedicineCount++
        }
      } else if (ownerAddedMedicine && !ownerAddedIllness) {
        // Owner has medicine, trainer can add illness
        if (random > 0.5) {
          const daysAgo = Math.floor(Math.random() * 30) + 1
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - daysAgo)
          const detail = trainerIllnessDetails[Math.floor(Math.random() * trainerIllnessDetails.length)]

          const sql = `INSERT INTO horse_illnesses (id, "horseId", "addedById", "startDate", "endDate", detail, "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, ${escapeSql(trainerUser.id)}, '${formatDate(startDate)}', NULL, ${escapeSql(detail)}, NOW(), NOW());`
          sqlStatements.push(sql)
          trainerIllnessCount++
        }
      } else if (!ownerAddedIllness && !ownerAddedMedicine) {
        // Owner added nothing, trainer can add either (but not both)
        if (random > 0.5) {
          // Add illness
          const daysAgo = Math.floor(Math.random() * 30) + 1
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - daysAgo)
          const detail = trainerIllnessDetails[Math.floor(Math.random() * trainerIllnessDetails.length)]

          const sql = `INSERT INTO horse_illnesses (id, "horseId", "addedById", "startDate", "endDate", detail, "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, ${escapeSql(trainerUser.id)}, '${formatDate(startDate)}', NULL, ${escapeSql(detail)}, NOW(), NOW());`
          sqlStatements.push(sql)
          trainerIllnessCount++
        } else {
          // Add medicine
          const medicineName = BANNED_MEDICINES[Math.floor(Math.random() * BANNED_MEDICINES.length)]
          const waitDays = waitDaysMap[medicineName] || Math.floor(Math.random() * 10) + 3
          const daysAgo = Math.floor(Math.random() * (waitDays - 1)) + 1
          const givenDate = new Date()
          givenDate.setDate(givenDate.getDate() - daysAgo)

          const sql = `INSERT INTO horse_banned_medicines (id, "horseId", "addedById", "medicineName", "givenDate", "waitDays", note, "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, ${escapeSql(trainerUser.id)}, ${escapeSql(medicineName)}, '${formatDate(givenDate)}', ${waitDays}, ${escapeSql(`${medicineName} uygulandı. Yarışa katılmadan önce ${waitDays} gün beklenmesi gerekiyor.`)}, NOW(), NOW());`
          sqlStatements.push(sql)
          trainerMedicineCount++
        }
      }
      // If owner added both, we already skipped above
    }

    // Generate trainer training plans (2-4 per horse, future dates)
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
    let trainerPlanCount = 0

    for (const horse of trainerHorses) {
      const numPlans = Math.floor(Math.random() * 3) + 2 // 2-4 plans
      for (let i = 0; i < numPlans; i++) {
        const daysAhead = Math.floor(Math.random() * 14) + 1
        const planDate = new Date()
        planDate.setDate(planDate.getDate() + daysAhead)
        const distance = distances[Math.floor(Math.random() * distances.length)]
        const note = trainingNotes[Math.floor(Math.random() * trainingNotes.length)]

        const sql = `INSERT INTO horse_training_plans (id, "horseId", "addedById", "planDate", distance, note, "racecourseId", "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, ${escapeSql(trainerUser.id)}, '${formatDate(planDate)}', ${escapeSql(distance)}, ${escapeSql(note)}, ${racecourse ? escapeSql(racecourse.id) : 'NULL'}, NOW(), NOW());`
        sqlStatements.push(sql)
        trainerPlanCount++
      }
    }

    console.log(`      [OK] Expenses: ${trainerExpenseCount}, Notes: ${trainerNoteCount}, Illnesses: ${trainerIllnessCount}, Medicines: ${trainerMedicineCount}, Training Plans: ${trainerPlanCount}`)
  }

  console.log(`  [OK] Generated trainer-created data SQL statements`)
}

async function main() {
  console.log('🚀 Starting demo data SQL generation...\n')

  try {
    // Get user and their horses
    const { user, horses } = await getUserAndHorses()

    if (horses.length === 0) {
      console.log('  [WARN] No horses found for user. Exiting.')
      return
    }

    // Validate ownerProfile and stablemate (TypeScript guard)
    if (!user.ownerProfile || !user.ownerProfile.stablemate) {
      throw new Error(`User does not have a valid owner profile or stablemate: ${USER_EMAIL}`)
    }

    const stablemateId = user.ownerProfile.stablemate.id

    // Add SQL header
    sqlStatements.unshift('-- Demo data SQL script')
    sqlStatements.unshift(`-- Generated for user: ${USER_EMAIL}`)
    sqlStatements.unshift(`-- Generated on: ${new Date().toISOString()}`)
    sqlStatements.unshift('-- Number of horses: ' + horses.length)
    sqlStatements.unshift('')
    sqlStatements.unshift('BEGIN;')
    sqlStatements.unshift('')

    // Generate expenses
    await addExpenses(horses, user, stablemateId)

    // Generate notes
    await addNotes(horses, user)

    // Distribution strategy:
    // - At most 2 horses: both active hastalik + active cikici ilac (with operations on illnesses)
    //   These MUST be horses with races in the last 3 months
    // - 2-3 horses: ONLY active hastalik (no banned medicine)
    // - 2-3 horses: ONLY active cikici ilac (no illness)
    // - Rest: neither
    
    // First, find horses that have run at least ONE race in the last 3 months
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    
    console.log(`  Checking for horses with at least one race in last 3 months (since ${threeMonthsAgo.toISOString()})`)
    
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
        console.log(`    [OK] Horse "${horse.name}" has race on ${recentRace.raceDate.toISOString()}`)
      }
    }
    
    console.log(`  Found ${horsesWithRecentRaces.length} horse(s) with at least one race in last 3 months`)
    
    // IMPORTANT: Select at most 2 horses ONLY from those with recent races for "both" condition
    // If no horses have recent races, skip the "both" condition entirely
    let horsesWithBoth: any[] = []
    let horsesWithBothIds: string[] = []
    
    if (horsesWithRecentRaces.length > 0) {
      // CRITICAL: Only select from horsesWithRecentRaces array (horses with at least one race in last 3 months)
      const shuffledRecentRaceHorses = [...horsesWithRecentRaces].sort(() => Math.random() - 0.5)
      horsesWithBoth = shuffledRecentRaceHorses.slice(0, Math.min(2, shuffledRecentRaceHorses.length))
      horsesWithBothIds = horsesWithBoth.map(h => h.id)
      
      console.log(`  Selected ${horsesWithBoth.length} horse(s) from ${horsesWithRecentRaces.length} horses with recent races for BOTH condition`)
      
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
          console.error(`  [ERROR] Horse "${horse.name}" (${horse.id}) was selected for "both" but verification shows no race in last 3 months! Removing from selection.`)
          // Remove from selection if verification fails
          horsesWithBoth = horsesWithBoth.filter(h => h.id !== horse.id)
          horsesWithBothIds = horsesWithBothIds.filter(id => id !== horse.id)
        } else {
          console.log(`  [OK] Verified: Horse "${horse.name}" has race on ${verifyRace.raceDate.toISOString()}`)
        }
      }
      
      if (horsesWithBoth.length > 0) {
        console.log(`  [OK] Final selection: ${horsesWithBoth.length} horse(s) with verified races in last 3 months for BOTH active hastalik + active cikici ilac`)
        horsesWithBoth.forEach(h => console.log(`    - ${h.name}`))
      } else {
        console.log(`  [WARN] After verification, no valid horses remain for "both" condition`)
      }
    } else {
      console.log(`  [WARN] No horses with races in last 3 months found, skipping "both" condition entirely`)
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
    
    console.log(`  Selected ${numHorsesWithOne} horse(s) for "only one" condition: ${illnessOnlyIds.length} illness-only, ${medicineOnlyIds.length} medicine-only`)
    console.log(`  Horses with BOTH: ${horsesWithBothIds.length} (${horsesWithBoth.map(h => h.name).join(', ')})`)
    console.log(`  Horses with ILLNESS ONLY: ${illnessOnlyIds.length} (${illnessOnlyHorses.map(h => h.name).join(', ')})`)
    console.log(`  Horses with MEDICINE ONLY: ${medicineOnlyIds.length} (${medicineOnlyHorses.map(h => h.name).join(', ')})`)
    
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
    console.log(`  Horses with NOTHING: ${horsesWithNothing.length} (${horsesWithNothing.map(h => h.name).join(', ')})`)
    
    console.log(`  📋 Distribution:`)
    console.log(`    - ${horsesWithBoth.length} horse(s) with BOTH active hastalik + active cikici ilac (with operations)`)
    console.log(`    - ${illnessOnlyHorses.length} horse(s) with ONLY active hastalik`)
    console.log(`    - ${medicineOnlyHorses.length} horse(s) with ONLY active cikici ilac`)
    console.log(`    - ${horses.length - allIllnessHorseIds.length - medicineOnlyIds.length} horse(s) with neither`)

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
      const illnessOperationSql = `DELETE FROM horse_illness_operations WHERE "illnessId" IN (${existingIllnessIds.map(i => escapeSql(i.id)).join(', ')});`
      sqlStatements.push(illnessOperationSql)
    }
    
    // Delete existing illnesses and banned medicines
    const deleteIllnessSql = `DELETE FROM horse_illnesses WHERE "horseId" IN (${horseIds.map(id => escapeSql(id)).join(', ')});`
    const deleteMedicineSql = `DELETE FROM horse_banned_medicines WHERE "horseId" IN (${horseIds.map(id => escapeSql(id)).join(', ')});`
    sqlStatements.push(deleteIllnessSql, deleteMedicineSql)
    
    console.log(`  [OK] Deleted existing illnesses and banned medicines for ${horseIds.length} horses`)

    // Generate illnesses (horses with both + horses with illness only)
    // Horses with both get operations, others may or may not
    await addIllnesses(horses, user, allIllnessHorseIds, horsesWithBothIds)
    
    // Generate banned medicines (horses with both + horses with medicine only)
    await addBannedMedicines(horses, user, allMedicineHorseIds, horsesWithBothIds)

    // Generate training plans
    await addTrainingPlans(horses, user)

    // Set horse locations based on race history
    await setHorseLocations(horses)

    // Generate trainer-created data
    await addTrainerData(horses, stablemateId, allIllnessHorseIds, allMedicineHorseIds)

    // Add SQL footer
    sqlStatements.push('')
    sqlStatements.push('COMMIT;')

    // Write SQL to file
    const sqlContent = sqlStatements.join('\n')
    fs.writeFileSync(SQL_OUTPUT_FILE, sqlContent, 'utf-8')

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('[OK] SQL script generation completed!')
    console.log('='.repeat(60))
    console.log(`\n📋 Summary for ${USER_EMAIL}:`)
    console.log(`  Horses: ${horses.length}`)
    console.log(`  SQL statements generated: ${sqlStatements.length - 5}`) // Exclude header/footer
    console.log(`  SQL file: ${SQL_OUTPUT_FILE}`)
    console.log('\n' + '='.repeat(60))
    console.log('\n💡 To apply the SQL script, run:')
    console.log(`   psql $DATABASE_URL -f ${SQL_OUTPUT_FILE}`)
    console.log('\n' + '='.repeat(60))
  } catch (error) {
    console.error('\n[ERROR] Error generating SQL:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

