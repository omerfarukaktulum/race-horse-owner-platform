import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const stablemateId = 'cmi0795hq002bs2ezkp6ew0l7'
  
  console.log(`Checking horses in stablemate: ${stablemateId}`)
  
  const stablemate = await prisma.stablemate.findUnique({
    where: { id: stablemateId },
    include: {
      horses: {
        include: {
          registrations: {
            orderBy: { raceDate: 'asc' },
          },
        },
      },
    },
  })
  
  if (!stablemate) {
    console.log('❌ Stablemate not found')
    return
  }
  
  console.log(`\nFound ${stablemate.horses.length} horses in stablemate`)
  
  for (const horse of stablemate.horses) {
    console.log(`\n--- ${horse.name} (${horse.id}) ---`)
    console.log(`  External Ref: ${horse.externalRef || 'N/A'}`)
    console.log(`  Data Fetched At: ${horse.dataFetchedAt ? horse.dataFetchedAt.toISOString() : 'NEVER'}`)
    console.log(`  Data Fetch Error: ${horse.dataFetchError || 'None'}`)
    console.log(`  Registrations in DB: ${horse.registrations.length}`)
    
    if (horse.registrations.length > 0) {
      console.log('  Registration dates:')
      horse.registrations.forEach(reg => {
        console.log(`    - ${reg.raceDate.toISOString().split('T')[0]} (${reg.type})`)
      })
    }
    
    // Check if DREAM CHASER
    if (horse.name.toUpperCase().includes('DREAM CHASER')) {
      console.log(`\n  ⚠ DREAM CHASER found!`)
      console.log(`  - Has externalRef: ${!!horse.externalRef}`)
      console.log(`  - Data fetched: ${!!horse.dataFetchedAt}`)
      console.log(`  - Registrations: ${horse.registrations.length}`)
      
      if (!horse.externalRef) {
        console.log(`  ❌ No externalRef - cannot fetch details`)
      } else if (!horse.dataFetchedAt) {
        console.log(`  ⚠ Data never fetched - need to fetch details`)
      } else if (horse.registrations.length === 0) {
        console.log(`  ⚠ No registrations found - might need to re-fetch`)
      }
    }
  }
  
  console.log(`\n\nTo re-fetch details for all horses, you can:`)
  console.log(`1. Go to each horse detail page and click "Fetch Details"`)
  console.log(`2. Or use the import horses page to re-fetch all horses`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

