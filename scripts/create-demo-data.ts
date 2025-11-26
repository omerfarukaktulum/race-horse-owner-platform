import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { searchTJKHorsesPlaywright } from '../lib/tjk-api'
import { BANNED_MEDICINES } from '../lib/constants/banned-medicines'

const prisma = new PrismaClient()

// Test data configuration
const OWNER_1 = {
  email: 'emrah.karamazi@demo.com',
  password: 'emrah123456',
  officialName: 'EMRAH KARAMAZI',
  officialRef: '7356',
  stablemateName: 'Emrah Karamazi Eküri',
  horses: ['general sherman', 'flying spice', 'viking'],
}

const OWNER_2 = {
  email: 'hayrettin.karamazi@demo.com',
  password: 'hayrettin123456',
  officialName: 'HAYRETTİN KARAMAZI',
  officialRef: '1281',
  stablemateName: 'Eküri Forması',
  horses: ['grand rapids', 'spas'],
}

const TRAINER = {
  email: 'engin.karatas@demo.com',
  password: 'engin123456',
  fullName: 'ENGİN KARATAŞ',
  tjkTrainerId: '2400',
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
] as const

/**
 * Normalize horse name for comparison (case-insensitive, trim whitespace)
 */
function normalizeHorseName(name: string): string {
  return name.toLowerCase().trim()
}

/**
 * Check if a horse name matches any of the target names
 */
function matchesHorseName(horseName: string, targetNames: string[]): boolean {
  const normalized = normalizeHorseName(horseName)
  return targetNames.some((target) => normalizeHorseName(target) === normalized)
}

/**
 * Create owner with stablemate
 */
async function createOwner(config: typeof OWNER_1) {
  console.log(`\n📝 Creating owner: ${config.officialName}`)
  
  // Check if owner already exists
  const existingOwner = await prisma.ownerProfile.findFirst({
    where: {
      officialRef: config.officialRef,
    },
    include: { user: true },
  })

  if (existingOwner) {
    console.log(`  ⚠ Owner already exists: ${existingOwner.user.email}`)
    return existingOwner
  }

  // Create user
  const passwordHash = await bcrypt.hash(config.password, 12)
  const user = await prisma.user.create({
    data: {
      email: config.email,
      passwordHash,
      role: 'OWNER',
      ownerProfile: {
        create: {
          officialName: config.officialName,
          officialRef: config.officialRef,
          stablemate: {
            create: {
              name: config.stablemateName,
              foundationYear: 2020,
              location: 'İstanbul',
            },
          },
        },
      },
    },
    include: {
      ownerProfile: {
        include: {
          stablemate: true,
        },
      },
    },
  })

  console.log(`  ✅ Created owner: ${config.email}`)
  console.log(`  ✅ Created stablemate: ${config.stablemateName}`)
  
  return user.ownerProfile!
}

/**
 * Create trainer
 */
async function createTrainer() {
  console.log(`\n📝 Creating trainer: ${TRAINER.fullName}`)
  
  // Check if trainer already exists
  const existingTrainer = await prisma.trainerProfile.findFirst({
    where: {
      tjkTrainerId: TRAINER.tjkTrainerId,
    },
    include: { user: true },
  })

  if (existingTrainer) {
    console.log(`  ⚠ Trainer already exists: ${existingTrainer.user.email}`)
    return existingTrainer
  }

  // Create user
  const passwordHash = await bcrypt.hash(TRAINER.password, 12)
  const user = await prisma.user.create({
    data: {
      email: TRAINER.email,
      passwordHash,
      role: 'TRAINER',
      trainerProfile: {
        create: {
          fullName: TRAINER.fullName,
          tjkTrainerId: TRAINER.tjkTrainerId,
          phone: '+90 555 000 0000',
        },
      },
    },
    include: {
      trainerProfile: true,
    },
  })

  console.log(`  ✅ Created trainer: ${TRAINER.email}`)
  
  return user.trainerProfile!
}

/**
 * Fetch and import horses for an owner
 */
async function importHorses(ownerProfile: any, targetHorseNames: string[], trainerProfile: any) {
  console.log(`\n🐴 Fetching horses for ${ownerProfile.officialName}...`)
  console.log(`  Target horses: ${targetHorseNames.join(', ')}`)

  try {
    // Fetch horses from TJK
    const tjkHorses = await searchTJKHorsesPlaywright(
      ownerProfile.officialName,
      ownerProfile.officialRef || undefined
    )

    console.log(`  📥 Fetched ${tjkHorses.length} horses from TJK`)

    // Filter to only target horses
    const filteredHorses = tjkHorses.filter((horse) =>
      matchesHorseName(horse.name, targetHorseNames)
    )

    console.log(`  ✅ Found ${filteredHorses.length} matching horses:`)
    filteredHorses.forEach((h) => console.log(`    - ${h.name}`))

    if (filteredHorses.length === 0) {
      console.log(`  ⚠ No matching horses found. Available horses:`)
      tjkHorses.slice(0, 10).forEach((h) => console.log(`    - ${h.name}`))
      return []
    }

    // Get stablemate
    const stablemate = await prisma.stablemate.findUnique({
      where: { ownerId: ownerProfile.id },
    })

    if (!stablemate) {
      throw new Error('Stablemate not found')
    }

    // Create or get horses (ONLY target horses)
    const createdHorses = []
    for (const horse of filteredHorses) {
      // Double-check: only process if it matches target names
      if (!matchesHorseName(horse.name, targetHorseNames)) {
        console.log(`  ⚠ Skipping ${horse.name} - not in target list`)
        continue
      }

      // Check if horse already exists
      const existing = await prisma.horse.findFirst({
        where: {
          stablemateId: stablemate.id,
          externalRef: horse.externalRef,
        },
      })

      if (existing) {
        console.log(`  ⚠ Horse already exists: ${horse.name}`)
        // Update trainer if needed
        if (existing.trainerId !== trainerProfile.id) {
          await prisma.horse.update({
            where: { id: existing.id },
            data: { trainerId: trainerProfile.id },
          })
          console.log(`  ✅ Updated trainer for: ${horse.name}`)
        }
        // Only add if it matches target names (double-check)
        if (matchesHorseName(existing.name, targetHorseNames)) {
          createdHorses.push(existing)
        } else {
          console.log(`  ⚠ Skipping ${existing.name} - not in target list`)
        }
        continue
      }

      const created = await prisma.horse.create({
        data: {
          stablemateId: stablemate.id,
          name: horse.name,
          yob: horse.yob,
          status: horse.status === 'MARE' ? 'MARE' : horse.status === 'STALLION' ? 'STALLION' : 'RACING',
          gender: horse.gender || undefined,
          externalRef: horse.externalRef || undefined,
          trainerId: trainerProfile.id,
          sireName: horse.sire || undefined,
          damName: horse.dam || undefined,
        },
      })

      console.log(`  ✅ Created horse: ${horse.name}`)
      createdHorses.push(created)
    }

    // Final verification: only return horses that match target names
    const verifiedHorses = createdHorses.filter(horse => 
      matchesHorseName(horse.name, targetHorseNames)
    )

    if (verifiedHorses.length !== createdHorses.length) {
      console.log(`  ⚠ Warning: Filtered out ${createdHorses.length - verifiedHorses.length} horses that don't match target names`)
    }

    return verifiedHorses
  } catch (error) {
    console.error(`  ❌ Error fetching horses:`, error)
    return []
  }
}

/**
 * Add sample expenses to horses
 */
async function addExpenses(horses: any[], ownerUser: any) {
  console.log(`\n💰 Adding expenses...`)

  const now = new Date()
  const expenses = []

  for (const horse of horses) {
    // Add 2-3 expenses per horse
    const numExpenses = Math.floor(Math.random() * 2) + 2

    for (let i = 0; i < numExpenses; i++) {
      const daysAgo = Math.floor(Math.random() * 30) + 1
      const expenseDate = new Date(now)
      expenseDate.setDate(expenseDate.getDate() - daysAgo)

      const category = EXPENSE_CATEGORIES[Math.floor(Math.random() * EXPENSE_CATEGORIES.length)]
      const amount = Math.floor(Math.random() * 5000) + 500 // 500-5500 TRY

      const expense = await prisma.expense.create({
        data: {
          horseId: horse.id,
          addedById: ownerUser.id,
          date: expenseDate,
          category,
          amount: amount.toString(),
          currency: 'TRY',
          note: `Demo expense for ${horse.name} - ${category}`,
        },
      })

      expenses.push(expense)
    }
  }

  console.log(`  ✅ Added ${expenses.length} expenses`)
  return expenses
}

/**
 * Add sample notes to horses
 */
async function addNotes(horses: any[], ownerUser: any) {
  console.log(`\n📝 Adding notes...`)

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
    // Add 1-2 notes per horse
    const numNotes = Math.floor(Math.random() * 2) + 1

    for (let i = 0; i < numNotes; i++) {
      const daysAgo = Math.floor(Math.random() * 14) + 1
      const noteDate = new Date(now)
      noteDate.setDate(noteDate.getDate() - daysAgo)

      const noteText = noteTemplates[Math.floor(Math.random() * noteTemplates.length)]

      const note = await prisma.horseNote.create({
        data: {
          horseId: horse.id,
          addedById: ownerUser.id,
          date: noteDate,
          note: `${horse.name} için: ${noteText}`,
        },
      })

      notes.push(note)
    }
  }

  console.log(`  ✅ Added ${notes.length} notes`)
  return notes
}

/**
 * Add sample illnesses to horses
 */
async function addIllnesses(horses: any[], ownerUser: any) {
  console.log(`\n🏥 Adding illnesses...`)

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
    // Add 0-1 illness per horse (some horses may not have illnesses)
    if (Math.random() > 0.5) {
      const daysAgo = Math.floor(Math.random() * 60) + 1
      const startDate = new Date(now)
      startDate.setDate(startDate.getDate() - daysAgo)

      // Some illnesses are ongoing (no endDate), some are resolved
      const isOngoing = Math.random() > 0.6
      const endDate = isOngoing ? null : (() => {
        const end = new Date(startDate)
        end.setDate(end.getDate() + Math.floor(Math.random() * 14) + 3)
        return end
      })()

      const detail = illnessDetails[Math.floor(Math.random() * illnessDetails.length)]

      const illness = await prisma.horseIllness.create({
        data: {
          horseId: horse.id,
          addedById: ownerUser.id,
          startDate,
          endDate,
          detail: `${horse.name} için: ${detail}`,
        },
      })

      // Add 0-2 operations for some illnesses
      if (!isOngoing && Math.random() > 0.5) {
        const numOperations = Math.floor(Math.random() * 2) + 1
        for (let i = 0; i < numOperations; i++) {
          const operationDate = new Date(startDate)
          operationDate.setDate(operationDate.getDate() + (i + 1) * 2)

          await prisma.horseIllnessOperation.create({
            data: {
              illnessId: illness.id,
              addedById: ownerUser.id,
              date: operationDate,
              description: `Kontrol ve tedavi uygulaması ${i + 1}`,
            },
          })
        }
      }

      illnesses.push(illness)
    }
  }

  console.log(`  ✅ Added ${illnesses.length} illnesses`)
  return illnesses
}

/**
 * Add sample banned medicines to horses
 */
async function addBannedMedicines(horses: any[], ownerUser: any) {
  console.log(`\n💊 Adding banned medicines...`)

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
    // Add 0-1 banned medicine per horse
    if (Math.random() > 0.6) {
      const daysAgo = Math.floor(Math.random() * 30) + 1
      const givenDate = new Date(now)
      givenDate.setDate(givenDate.getDate() - daysAgo)

      const medicineName = BANNED_MEDICINES[Math.floor(Math.random() * BANNED_MEDICINES.length)]
      const waitDays = waitDaysMap[medicineName] || Math.floor(Math.random() * 10) + 3

      const medicine = await prisma.horseBannedMedicine.create({
        data: {
          horseId: horse.id,
          addedById: ownerUser.id,
          medicineName,
          givenDate,
          waitDays,
          note: `${horse.name} için ${medicineName} uygulandı. Yarışa katılmadan önce ${waitDays} gün beklenmesi gerekiyor.`,
        },
      })

      medicines.push(medicine)
    }
  }

  console.log(`  ✅ Added ${medicines.length} banned medicines`)
  return medicines
}

/**
 * Add sample training plans to horses
 */
async function addTrainingPlans(horses: any[], ownerUser: any) {
  console.log(`\n📅 Adding training plans...`)

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

      const plan = await prisma.horseTrainingPlan.create({
        data: {
          horseId: horse.id,
          addedById: ownerUser.id,
          planDate,
          distance,
          note: `${horse.name} için: ${note}`,
          racecourseId: racecourse?.id || undefined,
        },
      })

      plans.push(plan)
    }
  }

  console.log(`  ✅ Added ${plans.length} training plans`)
  return plans
}

/**
 * Link trainer to stablemate
 */
async function linkTrainerToStablemate(stablemateId: string, trainerProfile: any) {
  console.log(`\n🔗 Linking trainer to stablemate...`)

  // Check if link already exists
  const existing = await prisma.stablemateTrainer.findFirst({
    where: {
      stablemateId,
      trainerProfileId: trainerProfile.id,
    },
  })

  if (existing) {
    console.log(`  ⚠ Trainer already linked`)
    return existing
  }

  const link = await prisma.stablemateTrainer.create({
    data: {
      stablemateId,
      trainerProfileId: trainerProfile.id,
      trainerName: trainerProfile.fullName,
      trainerExternalId: trainerProfile.tjkTrainerId || undefined,
      isActive: true,
    },
  })

  console.log(`  ✅ Linked trainer to stablemate`)
  return link
}

async function main() {
  console.log('🚀 Starting demo data creation...\n')

  try {
    // Create trainer first
    const trainerProfile = await createTrainer()

    // Create owner 1
    const owner1Profile = await createOwner(OWNER_1)
    const owner1User = await prisma.user.findUnique({
      where: { id: owner1Profile.userId },
    })

    if (!owner1User) {
      throw new Error('Failed to find owner1 user')
    }

    // Create owner 2
    const owner2Profile = await createOwner(OWNER_2)
    const owner2User = await prisma.user.findUnique({
      where: { id: owner2Profile.userId },
    })

    if (!owner2User) {
      throw new Error('Failed to find owner2 user')
    }

    // Get stablemates
    const stablemate1 = await prisma.stablemate.findUnique({
      where: { ownerId: owner1Profile.id },
    })

    if (!stablemate1) {
      throw new Error('Failed to find stablemate1')
    }

    const stablemate2 = await prisma.stablemate.findUnique({
      where: { ownerId: owner2Profile.id },
    })

    if (!stablemate2) {
      throw new Error('Failed to find stablemate2')
    }

    // Link trainer to both stablemates
    await linkTrainerToStablemate(stablemate1.id, trainerProfile)
    await linkTrainerToStablemate(stablemate2.id, trainerProfile)

    // Import horses for owner 1
    const owner1Horses = await importHorses(owner1Profile, OWNER_1.horses, trainerProfile)

    // Import horses for owner 2
    const owner2Horses = await importHorses(owner2Profile, OWNER_2.horses, trainerProfile)

    // Add expenses
    if (owner1Horses.length > 0) {
      await addExpenses(owner1Horses, owner1User)
    }
    if (owner2Horses.length > 0) {
      await addExpenses(owner2Horses, owner2User)
    }

    // Add notes
    if (owner1Horses.length > 0) {
      await addNotes(owner1Horses, owner1User)
    }
    if (owner2Horses.length > 0) {
      await addNotes(owner2Horses, owner2User)
    }

    // Add illnesses
    if (owner1Horses.length > 0) {
      await addIllnesses(owner1Horses, owner1User)
    }
    if (owner2Horses.length > 0) {
      await addIllnesses(owner2Horses, owner2User)
    }

    // Add banned medicines
    if (owner1Horses.length > 0) {
      await addBannedMedicines(owner1Horses, owner1User)
    }
    if (owner2Horses.length > 0) {
      await addBannedMedicines(owner2Horses, owner2User)
    }

    // Add training plans
    if (owner1Horses.length > 0) {
      await addTrainingPlans(owner1Horses, owner1User)
    }
    if (owner2Horses.length > 0) {
      await addTrainingPlans(owner2Horses, owner2User)
    }

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ Demo data creation completed!')
    console.log('='.repeat(60))
    console.log('\n📋 User Credentials:\n')
    console.log('Owner 1:')
    console.log(`  Email: ${OWNER_1.email}`)
    console.log(`  Password: ${OWNER_1.password}`)
    console.log(`  Name: ${OWNER_1.officialName}`)
    console.log(`  Horses: ${owner1Horses.length} imported`)
    console.log('\nOwner 2:')
    console.log(`  Email: ${OWNER_2.email}`)
    console.log(`  Password: ${OWNER_2.password}`)
    console.log(`  Name: ${OWNER_2.officialName}`)
    console.log(`  Horses: ${owner2Horses.length} imported`)
    console.log('\nTrainer:')
    console.log(`  Email: ${TRAINER.email}`)
    console.log(`  Password: ${TRAINER.password}`)
    console.log(`  Name: ${TRAINER.fullName}`)
    console.log('\n' + '='.repeat(60))
  } catch (error) {
    console.error('\n❌ Error creating demo data:', error)
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

