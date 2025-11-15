import { PrismaClient } from '@prisma/client'
import { fetchTJKHorseDetail } from '../lib/tjk-horse-detail-scraper'

const prisma = new PrismaClient()

async function main() {
  const horseId = process.argv[2]
  
  if (!horseId) {
    console.log('Usage: npx tsx scripts/fetch-single-horse.ts <horseId>')
    console.log('Example: npx tsx scripts/fetch-single-horse.ts cmi079j31002ds2ezr0i1y6b1')
    process.exit(1)
  }
  
  const horse = await prisma.horse.findUnique({
    where: { id: horseId },
  })
  
  if (!horse) {
    console.log('❌ Horse not found')
    return
  }
  
  if (!horse.externalRef) {
    console.log('❌ Horse has no externalRef')
    return
  }
  
  console.log(`\n📥 Fetching details for: ${horse.name} (TJK ID: ${horse.externalRef})\n`)
  
  try {
    const detailData = await fetchTJKHorseDetail(horse.externalRef)
    
    if (!detailData) {
      console.log(`  ❌ Failed to fetch data`)
      return
    }
    
    console.log(`\n📊 Results:`)
    console.log(`  - Races: ${detailData.races?.length || 0}`)
    console.log(`  - Registrations: ${detailData.registrations?.length || 0}`)
    
    if (detailData.registrations && detailData.registrations.length > 0) {
      console.log(`\n✅ Found registrations:`)
      detailData.registrations.forEach(reg => {
        console.log(`  - ${reg.raceDate} (${reg.type}) - ${reg.city || 'N/A'}`)
      })
    }
    
    // Update horse
    await prisma.horse.update({
      where: { id: horse.id },
      data: {
        dataFetchedAt: new Date(),
        dataFetchError: null,
      },
    })
    
    // Store registrations
    if (detailData.registrations && detailData.registrations.length > 0) {
      await prisma.horseRegistration.deleteMany({
        where: { horseId: horse.id },
      })
      
      await prisma.horseRegistration.createMany({
        data: detailData.registrations.map((reg) => ({
          horseId: horse.id,
          raceDate: new Date(reg.raceDate.split('.').reverse().join('-')),
          city: reg.city,
          distance: reg.distance,
          surface: reg.surface,
          surfaceType: reg.surfaceType,
          raceType: reg.raceType,
          type: reg.type,
          jockeyName: reg.jockeyName,
          jockeyId: reg.jockeyId,
        })),
      })
      
      console.log(`\n✅ Stored ${detailData.registrations.length} registrations in database`)
    } else {
      console.log(`\n⚠️  No registrations found in scraped data`)
    }
    
  } catch (error) {
    console.error(`  ❌ Error:`, error)
  } finally {
    await prisma.$disconnect()
    // Force exit after a short delay to ensure cleanup
    setTimeout(() => process.exit(0), 1000)
  }
}

main()

