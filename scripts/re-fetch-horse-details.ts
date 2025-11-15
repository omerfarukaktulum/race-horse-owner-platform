import { PrismaClient } from '@prisma/client'
import { fetchTJKHorseDetail } from '../lib/tjk-horse-detail-scraper'

const prisma = new PrismaClient()

async function main() {
  const stablemateId = process.argv[2] || 'cmi0795hq002bs2ezkp6ew0l7'
  const horseName = process.argv[3] // Optional: specific horse name
  
  console.log(`Re-fetching horse details for stablemate: ${stablemateId}`)
  if (horseName) {
    console.log(`Filtering for horse: ${horseName}`)
  }
  
  const stablemate = await prisma.stablemate.findUnique({
    where: { id: stablemateId },
    include: {
      horses: {
        where: horseName ? {
          name: {
            contains: horseName,
            mode: 'insensitive',
          },
        } : undefined,
      },
    },
  })
  
  if (!stablemate) {
    console.log('❌ Stablemate not found')
    return
  }
  
  console.log(`\nFound ${stablemate.horses.length} horses to re-fetch\n`)
  
  for (const horse of stablemate.horses) {
    if (!horse.externalRef) {
      console.log(`⏭ Skipping ${horse.name} - no externalRef`)
      continue
    }
    
    console.log(`\n📥 Fetching details for: ${horse.name} (ID: ${horse.externalRef})`)
    
    try {
      const detailData = await fetchTJKHorseDetail(horse.externalRef)
      
      if (!detailData) {
        console.log(`  ❌ Failed to fetch data`)
        continue
      }
      
      console.log(`  ✓ Fetched ${detailData.races?.length || 0} races`)
      console.log(`  ✓ Fetched ${detailData.registrations?.length || 0} registrations`)
      
      // Update horse with detailed data
      await prisma.horse.update({
        where: { id: horse.id },
        data: {
          handicapPoints: detailData.handicapPoints,
          totalEarnings: detailData.totalEarnings ? detailData.totalEarnings.toString() : null,
          prizeMoney: detailData.prizeMoney ? detailData.prizeMoney.toString() : null,
          ownerPremium: detailData.ownerPremium ? detailData.ownerPremium.toString() : null,
          breederPremium: detailData.breederPremium ? detailData.breederPremium.toString() : null,
          totalRaces: detailData.totalRaces,
          firstPlaces: detailData.firstPlaces,
          secondPlaces: detailData.secondPlaces,
          thirdPlaces: detailData.thirdPlaces,
          fourthPlaces: detailData.fourthPlaces,
          fifthPlaces: detailData.fifthPlaces,
          turfRaces: detailData.turfRaces,
          turfFirsts: detailData.turfFirsts,
          turfEarnings: detailData.turfEarnings ? detailData.turfEarnings.toString() : null,
          dirtRaces: detailData.dirtRaces,
          dirtFirsts: detailData.dirtFirsts,
          dirtEarnings: detailData.dirtEarnings ? detailData.dirtEarnings.toString() : null,
          syntheticRaces: detailData.syntheticRaces,
          syntheticFirsts: detailData.syntheticFirsts,
          syntheticEarnings: detailData.syntheticEarnings ? detailData.syntheticEarnings.toString() : null,
          sireName: detailData.sireName,
          damName: detailData.damName,
          sireSire: detailData.sireSire,
          sireDam: detailData.sireDam,
          damSire: detailData.damSire,
          damDam: detailData.damDam,
          dataFetchedAt: new Date(),
          dataFetchError: null,
        },
      })
      
      // Delete existing race history and create new
      if (detailData.races && detailData.races.length > 0) {
        await prisma.horseRaceHistory.deleteMany({
          where: { horseId: horse.id },
        })
        
        await prisma.horseRaceHistory.createMany({
          data: detailData.races.map((race) => ({
            horseId: horse.id,
            raceDate: new Date(race.raceDate.split('.').reverse().join('-')),
            city: race.city,
            distance: race.distance,
            surface: race.surface,
            surfaceType: race.surfaceType,
            position: race.position,
            derece: race.derece || null,
            weight: race.weight ? race.weight.toString() : null,
            jockeyName: race.jockeyName,
            jockeyId: race.jockeyId,
            raceNumber: race.raceNumber,
            raceName: race.raceName,
            raceType: race.raceType,
            trainerName: race.trainerName,
            trainerId: race.trainerId,
            handicapPoints: race.handicapPoints,
            prizeMoney: race.prizeMoney ? race.prizeMoney.toString() : null,
            videoUrl: race.videoUrl,
            photoUrl: race.photoUrl,
          })),
        })
        
        console.log(`  ✓ Stored ${detailData.races.length} races`)
      }
      
      // Delete existing registrations and create new
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
        
        console.log(`  ✓ Stored ${detailData.registrations.length} registrations`)
        detailData.registrations.forEach(reg => {
          console.log(`    - ${reg.raceDate} (${reg.type})`)
        })
      } else {
        console.log(`  ⚠ No registrations found`)
      }
      
      console.log(`  ✅ Successfully updated ${horse.name}`)
      
      // Wait a bit between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error) {
      console.error(`  ❌ Error fetching ${horse.name}:`, error)
      await prisma.horse.update({
        where: { id: horse.id },
        data: {
          dataFetchError: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    }
  }
  
  console.log(`\n✅ Done!`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

