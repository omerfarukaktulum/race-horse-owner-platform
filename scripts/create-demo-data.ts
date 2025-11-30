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
  console.log(`\n🔍 Finding user: ${USER_EMAIL}`)
  
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL },
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
    throw new Error(`User not found: ${USER_EMAIL}`)
  }

  if (!user.ownerProfile) {
    throw new Error(`User does not have an owner profile: ${USER_EMAIL}`)
  }

  if (!user.ownerProfile.stablemate) {
    throw new Error(`User does not have a stablemate: ${USER_EMAIL}`)
  }

  const horses = user.ownerProfile.stablemate.horses

  console.log(`  ✅ Found user: ${user.email}`)
  console.log(`  ✅ Found stablemate: ${user.ownerProfile.stablemate.name}`)
  console.log(`  ✅ Found ${horses.length} horses`)

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
  console.log(`\n💰 Generating expenses SQL...`)

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

  console.log(`  ✅ Generated ${horseExpenseCount} horse-specific expenses`)
  console.log(`  ✅ Generated ${stablemateExpenseCount} stablemate-level expenses`)
  console.log(`  ✅ Total: ${expenses.length} expense SQL statements`)
  return expenses
}

/**
 * Add sample notes to horses
 */
async function addNotes(horses: any[], ownerUser: any) {
  console.log(`\n📝 Generating notes SQL...`)

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
    // Add 5-10 notes per horse
    const numNotes = Math.floor(Math.random() * 6) + 5

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

  console.log(`  ✅ Generated ${notes.length} note SQL statements`)
  return notes
}

/**
 * Add sample illnesses to horses
 */
async function addIllnesses(horses: any[], ownerUser: any) {
  console.log(`\n🏥 Generating illnesses SQL...`)

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
      const hasOperations = !isOngoing && Math.random() > 0.5
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

  console.log(`  ✅ Generated ${illnesses.length} illness SQL statements`)
  return illnesses
}

/**
 * Add sample banned medicines to horses
 */
async function addBannedMedicines(horses: any[], ownerUser: any) {
  console.log(`\n💊 Generating banned medicines SQL...`)

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

      const sql = `INSERT INTO horse_banned_medicines (id, "horseId", "addedById", "medicineName", "givenDate", "waitDays", note, "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${escapeSql(horse.id)}, ${escapeSql(ownerUser.id)}, ${escapeSql(medicineName)}, '${formatDate(givenDate)}', ${waitDays}, ${escapeSql(`${medicineName} uygulandı. Yarışa katılmadan önce ${waitDays} gün beklenmesi gerekiyor.`)}, NOW(), NOW());`
      
      sqlStatements.push(sql)
      medicines.push({ id: 'generated', horseId: horse.id })
    }
  }

  console.log(`  ✅ Generated ${medicines.length} banned medicine SQL statements`)
  return medicines
}

/**
 * Add sample training plans to horses
 */
async function addTrainingPlans(horses: any[], ownerUser: any) {
  console.log(`\n📅 Generating training plans SQL...`)

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

  console.log(`  ✅ Generated ${plans.length} training plan SQL statements`)
  return plans
}

async function main() {
  console.log('🚀 Starting demo data SQL generation...\n')

  try {
    // Get user and their horses
    const { user, horses } = await getUserAndHorses()

    if (horses.length === 0) {
      console.log('  ⚠ No horses found for user. Exiting.')
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

    // Generate illnesses
    await addIllnesses(horses, user)

    // Generate banned medicines
    await addBannedMedicines(horses, user)

    // Generate training plans
    await addTrainingPlans(horses, user)

    // Add SQL footer
    sqlStatements.push('')
    sqlStatements.push('COMMIT;')

    // Write SQL to file
    const sqlContent = sqlStatements.join('\n')
    fs.writeFileSync(SQL_OUTPUT_FILE, sqlContent, 'utf-8')

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ SQL script generation completed!')
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
    console.error('\n❌ Error generating SQL:', error)
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

