import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { fetchTJKHorseDetail } from '@/lib/tjk-horse-detail-scraper'
import { fetchTJKHorseGallops } from '@/lib/tjk-gallops-scraper'
import { fetchTJKPedigree } from '@/lib/tjk-pedigree-scraper'
import { verifyAdminAndGetTargetUserId } from '@/lib/admin-helper'

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

    // Check if admin mode (admin creating account for target user)
    const { isAdmin } = await verifyAdminAndGetTargetUserId()
    
    // Use admin Prisma client if in admin mode (respects database switch preference)
    const prismaClient = isAdmin ? getAdminPrismaClient() : prisma

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
      let stablemateIds: string[] = []
      try {
        const horses = await prismaClient.horse.findMany({
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
          ? await prismaClient.ownerProfile.findUnique({
              where: { userId: decoded.id },
            })
          : null

        if (!ownerProfile && decoded.role !== 'ADMIN') {
          console.error('[Background Fetch] Owner profile not found')
          return
        }

        // Get unique stablemate IDs and set status to IN_PROGRESS
        stablemateIds = [...new Set(horses.map(h => h.stablemate.id))]
        for (const stablemateId of stablemateIds) {
          try {
            await prismaClient.stablemate.update({
              where: { id: stablemateId },
              data: {
                dataFetchStatus: 'IN_PROGRESS',
                dataFetchStartedAt: new Date(),
              } as any,
            })
          } catch (error) {
            // Ignore if field doesn't exist yet (migration not run)
            console.log('[Background Fetch] Could not update status (migration may not be run yet)')
          }
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
            const currentHorse = await prismaClient.horse.findUnique({
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
            await prismaClient.horse.update({
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
              await prismaClient.horseRaceHistory.deleteMany({
                where: { horseId: horse.id },
              })

              await prismaClient.horseRaceHistory.createMany({
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
              await prismaClient.horseRegistration.deleteMany({
                where: { horseId: horse.id },
              })

              await prismaClient.horseRegistration.createMany({
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
                await prismaClient.horseGallop.deleteMany({
                  where: { horseId: horse.id },
                })

                await prismaClient.horseGallop.createMany({
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

            // Fetch and store pedigree (4 generations) for this horse
            try {
              console.log(`[Background Fetch] Starting pedigree fetch for ${horse.name} (ID: ${horse.externalRef})`)
              const pedigreeData = await fetchTJKPedigree(horse.externalRef!, horse.name)
              
              console.log(`[Background Fetch] Pedigree data received for ${horse.name}:`, {
                hasSire: !!pedigreeData?.sireName,
                hasDam: !!pedigreeData?.damName,
                hasSireSire: !!pedigreeData?.sireSire,
                hasSireDam: !!pedigreeData?.sireDam,
                hasDamSire: !!pedigreeData?.damSire,
                hasDamDam: !!pedigreeData?.damDam,
                gen4Count: pedigreeData ? [
                  pedigreeData.sireSireSire, pedigreeData.sireSireDam, pedigreeData.sireDamSire, pedigreeData.sireDamDam,
                  pedigreeData.damSireSire, pedigreeData.damSireDam, pedigreeData.damDamSire, pedigreeData.damDamDam
                ].filter(Boolean).length : 0
              })
              
              if (pedigreeData) {
                // Update horse with extended pedigree data
                const updateData: any = {}
                
                // Generation 2
                if (pedigreeData.sireName) updateData.sireName = pedigreeData.sireName
                if (pedigreeData.damName) updateData.damName = pedigreeData.damName
                
                // Generation 3
                if (pedigreeData.sireSire) updateData.sireSire = pedigreeData.sireSire
                if (pedigreeData.sireDam) updateData.sireDam = pedigreeData.sireDam
                if (pedigreeData.damSire) updateData.damSire = pedigreeData.damSire
                if (pedigreeData.damDam) updateData.damDam = pedigreeData.damDam
                
                // Generation 4
                if (pedigreeData.sireSireSire) updateData.sireSireSire = pedigreeData.sireSireSire
                if (pedigreeData.sireSireDam) updateData.sireSireDam = pedigreeData.sireSireDam
                if (pedigreeData.sireDamSire) updateData.sireDamSire = pedigreeData.sireDamSire
                if (pedigreeData.sireDamDam) updateData.sireDamDam = pedigreeData.sireDamDam
                if (pedigreeData.damSireSire) updateData.damSireSire = pedigreeData.damSireSire
                if (pedigreeData.damSireDam) updateData.damSireDam = pedigreeData.damSireDam
                if (pedigreeData.damDamSire) updateData.damDamSire = pedigreeData.damDamSire
                if (pedigreeData.damDamDam) updateData.damDamDam = pedigreeData.damDamDam
                
                await prismaClient.horse.update({
                  where: { id: horse.id },
                  data: updateData,
                })
                
                // Stored pedigree data
              } else {
                // No pedigree data returned
              }
            } catch (pedigreeError: any) {
              console.error(`[Background Fetch] Error fetching pedigree:`, pedigreeError.message)
              console.error(`[Background Fetch] Pedigree error stack:`, pedigreeError.stack)
              // Don't fail the whole process if pedigree fails
            }

            console.log(`[Background Fetch] Successfully processed ${horse.name}`)
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (error: any) {
            console.error(`[Background Fetch] Error processing horse ${horse.name}:`, error.message)
            
            await prismaClient.horse.update({
              where: { id: horse.id },
              data: {
                dataFetchError: error.message || 'Unknown error',
              },
            })
          }
        }

        console.log('[Background Fetch] Completed processing all horses')
        
        // Update status to COMPLETED for all stablemates
        for (const stablemateId of stablemateIds) {
          try {
            await prismaClient.stablemate.update({
              where: { id: stablemateId },
              data: {
                dataFetchStatus: 'COMPLETED',
                dataFetchCompletedAt: new Date(),
              } as any,
            })
          } catch (error) {
            // Ignore if field doesn't exist yet
            console.log('[Background Fetch] Could not update status to COMPLETED')
          }
        }
      } catch (error: any) {
        console.error('[Background Fetch] Fatal error:', error.message)
        
        // Update status to FAILED for all stablemates
        if (stablemateIds.length > 0) {
          for (const stablemateId of stablemateIds) {
            try {
              await prismaClient.stablemate.update({
                where: { id: stablemateId },
                data: {
                  dataFetchStatus: 'FAILED',
                  dataFetchCompletedAt: new Date(),
                } as any,
              })
              } catch (updateError) {
              // Ignore if field doesn't exist yet
            }
          }
        }
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

