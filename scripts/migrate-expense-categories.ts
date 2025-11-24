import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting expense category migration...')

  // Step 1: Add new enum values first (if they don't exist)
  console.log('Adding new enum values...')
  try {
    await prisma.$executeRaw`ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'YARIS_KAYIT_DECLARE'`
    await prisma.$executeRaw`ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'YEM_SAMAN_OT_TALAS'`
    await prisma.$executeRaw`ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'SIGORTA'`
    await prisma.$executeRaw`ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'MONT'`
    await prisma.$executeRaw`ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'NAL_NALBANT'`
    await prisma.$executeRaw`ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'SARAC'`
  } catch (e: any) {
    console.log('Note: Some enum values may already exist:', e.message)
  }

  // Step 2: Update existing expense categories to new values
  console.log('Updating YARIS_KAYIT to YARIS_KAYIT_DECLARE...')
  await prisma.$executeRaw`
    UPDATE expenses 
    SET category = 'YARIS_KAYIT_DECLARE'::"ExpenseCategory"
    WHERE category::text = 'YARIS_KAYIT'
  `.catch((e) => {
    console.log('Note:', e.message)
  })

  console.log('Updating YEM_SAMAN_OT to YEM_SAMAN_OT_TALAS...')
  await prisma.$executeRaw`
    UPDATE expenses 
    SET category = 'YEM_SAMAN_OT_TALAS'::"ExpenseCategory"
    WHERE category::text = 'YEM_SAMAN_OT'
  `.catch((e) => {
    console.log('Note:', e.message)
  })

  console.log('Updating EKSTRA_ILAC to ILAC...')
  await prisma.$executeRaw`
    UPDATE expenses 
    SET category = 'ILAC'::"ExpenseCategory"
    WHERE category::text = 'EKSTRA_ILAC'
  `.catch((e) => {
    console.log('Note:', e.message)
  })

  console.log('Updating OZEL to SEYIS...')
  await prisma.$executeRaw`
    UPDATE expenses 
    SET category = 'SEYIS'::"ExpenseCategory"
    WHERE category::text = 'OZEL'
  `.catch((e) => {
    console.log('Note:', e.message)
  })

  console.log('Migration completed!')
  console.log('Now run: npx prisma db push --accept-data-loss')
}

main()
  .catch((e) => {
    console.error('Migration error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

