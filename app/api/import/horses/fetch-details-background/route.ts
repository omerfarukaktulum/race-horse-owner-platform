import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { fetchTJKHorseDetail } from '@/lib/tjk-horse-detail-scraper'
import { fetchTJKHorseGallops } from '@/lib/tjk-gallops-scraper'

// This endpoint starts the detail fetch in the background without blocking
export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      role: string
    }

    const body = await request.json()
    const { horseIds } = body

    if (!horseIds || !Array.isArray(horseIds) || horseIds.length === 0) {
      return NextResponse.json(
        { error: 'Horse IDs are required' },
        { status: 400 }
      )
    }

    // Start the fetch in the background (don't await)
    // Process horses in background without blocking the response
    ;(async () => {
      try {
        const horses = await prisma.horse.findMany({
          where: {
            id: { in: horseIds },
            externalRef: { not: null },
          },
          include: {
            stablemate: {
              include: {
                owner: true,
              },
            },
          },
        })

        // Verify ownership
        const ownerProfile = decoded.role === 'OWNER' 
          ? await prisma.ownerProfile.findUnique({
              where: { userId: decoded.id },
            })
          : null

        if (!ownerProfile && decoded.role !== 'ADMIN') {
          console.error('[Background Fetch] Owner profile not found')
          return
        }

        // Process each horse
        for (const horse of horses) {
          // Verify ownership
          if (decoded.role === 'OWNER' && horse.stablemate.ownerId !== ownerProfile!.id) {
            console.error(`[Background Fetch] Not authorized for horse ${horse.name}`)
            continue
          }

          try {
            console.log(`[Background Fetch] Processing ${horse.name}...`)
            
            const detailData = await fetchTJKHorseDetail(horse.externalRef!)

            if (!detailData) {
              console.error(`[Background Fetch] No data returned for ${horse.name}`)
              continue
            }

            // Get current horse data to preserve existing pedigree if it's more complete
            const currentHorse = await prisma.horse.findUnique({
              where: { id: horse.id },
              select: { sireName: true, damName: true },
            })

            // Only update sireName/damName if new value is more complete
            const shouldUpdateSire = !currentHorse?.sireName || 
              (detailData.sireName && 
               detailData.sireName.length >= 3 && 
               detailData.sireName.length > (currentHorse.sireName?.length || 0))
            const shouldUpdateDam = !currentHorse?.damName || 
              (detailData.damName && 
               detailData.damName.length >= 3 && 
               detailData.damName.length > (currentHorse.damName?.length || 0))

            // Update horse with detailed data (same logic as stream endpoint)
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
                sireName: shouldUpdateSire ? detailData.sireName : currentHorse?.sireName,
                damName: shouldUpdateDam ? detailData.damName : currentHorse?.damName,
                sireSire: detailData.sireSire,
                sireDam: detailData.sireDam,
                damSire: detailData.damSire,
                damDam: detailData.damDam,
                dataFetchedAt: new Date(),
                dataFetchError: null,
              },
            })

            // Update race history
            if (detailData.races && detailData.races.length > 0) {
              await prisma.horseRaceHistory.deleteMany({
                where: { horseId: horse.id },
              })

              await prisma.horseRaceHistory.createMany({
                data: detailData.races.map((race) => {
                  let raceDate = new Date()
                  if (race.raceDate && race.raceDate.match(/\d{2}\.\d{2}\.\d{4}/)) {
                    const dateParts = race.raceDate.split('.')
                    if (dateParts.length === 3) {
                      raceDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`)
                      if (isNaN(raceDate.getTime())) {
                        raceDate = new Date()
                      }
                    }
                  }

                  return {
                    horseId: horse.id,
                    raceDate,
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
                  }
                }),
              })
            }

            // Update registrations
            if (detailData.registrations && detailData.registrations.length > 0) {
              await prisma.horseRegistration.deleteMany({
                where: { horseId: horse.id },
              })

              await prisma.horseRegistration.createMany({
                data: detailData.registrations.map((reg) => {
                  let raceDate = new Date()
                  if (reg.raceDate && reg.raceDate.match(/\d{2}\.\d{2}\.\d{4}/)) {
                    const dateParts = reg.raceDate.split('.')
                    if (dateParts.length === 3) {
                      raceDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`)
                      if (isNaN(raceDate.getTime())) {
                        raceDate = new Date()
                      }
                    }
                  }

                  return {
                    horseId: horse.id,
                    raceDate,
                    city: reg.city,
                    distance: reg.distance,
                    surface: reg.surface,
                    surfaceType: reg.surfaceType,
                    raceType: reg.raceType,
                    type: reg.type,
                    jockeyName: reg.jockeyName,
                    jockeyId: reg.jockeyId,
                  }
                }),
              })
            }

            // Fetch and store gallops
            try {
              const gallopsData = await fetchTJKHorseGallops(horse.externalRef!, horse.name)
              
              if (gallopsData && gallopsData.length > 0) {
                await prisma.horseGallop.deleteMany({
                  where: { horseId: horse.id },
                })

                await prisma.horseGallop.createMany({
                  data: gallopsData.map((gallop) => {
                    let gallopDate = new Date()
                    if (gallop.date && gallop.date.match(/\d{2}\.\d{2}\.\d{4}/)) {
                      const dateParts = gallop.date.split('.')
                      if (dateParts.length === 3) {
                        gallopDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`)
                        if (isNaN(gallopDate.getTime())) {
                          gallopDate = new Date()
                        }
                      }
                    }

                    return {
                      horseId: horse.id,
                      gallopDate,
                      status: gallop.status || null,
                      racecourse: gallop.racecourse || null,
                      surface: gallop.surface || null,
                      jockeyName: gallop.jockeyName || null,
                      distances: gallop.distances || {},
                    }
                  }),
                })
              }
            } catch (gallopError: any) {
              console.error(`[Background Fetch] Error fetching gallops for ${horse.name}:`, gallopError.message)
            }

            console.log(`[Background Fetch] Successfully processed ${horse.name}`)
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (error: any) {
            console.error(`[Background Fetch] Error processing horse ${horse.name}:`, error.message)
            
            await prisma.horse.update({
              where: { id: horse.id },
              data: {
                dataFetchError: error.message || 'Unknown error',
              },
            })
          }
        }

        console.log('[Background Fetch] Completed processing all horses')
      } catch (error: any) {
        console.error('[Background Fetch] Fatal error:', error.message)
      }
    })()

    // Return immediately without waiting for the background process
    return NextResponse.json({
      success: true,
      message: 'Background fetch started',
    })
  } catch (error) {
    console.error('Start background fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to start background fetch' },
      { status: 500 }
    )
  }
}

