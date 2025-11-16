import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { fetchTJKHorseDetail } from '@/lib/tjk-horse-detail-scraper'
import { fetchTJKHorseGallops } from '@/lib/tjk-gallops-scraper'
import { fetchTJKPedigree } from '@/lib/tjk-pedigree-scraper'

/**
 * Stream progress updates while fetching detailed data for multiple horses
 * Uses Server-Sent Events (SSE) for real-time progress updates
 */
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

    if (decoded.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { horseIds } = body

    if (!Array.isArray(horseIds) || horseIds.length === 0) {
      return NextResponse.json(
        { error: 'Horse IDs array is required' },
        { status: 400 }
      )
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        const sendProgress = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          // Get horses with externalRef
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
          const ownerProfile = await prisma.ownerProfile.findUnique({
            where: { userId: decoded.id },
          })

          if (!ownerProfile) {
            sendProgress({ error: 'Owner profile not found', done: true })
            controller.close()
            return
          }

          const results: any[] = []
          const errors: any[] = []

          // Process each horse
          for (let i = 0; i < horses.length; i++) {
            const horse = horses[i]
            
            // Verify ownership
            if (horse.stablemate.ownerId !== ownerProfile.id) {
              errors.push({ horseId: horse.id, name: horse.name, error: 'Not authorized' })
              sendProgress({
                current: i + 1,
                total: horses.length,
                currentHorse: horse.name,
                processed: i + 1,
                errors: errors.length,
              })
              continue
            }

            try {
              sendProgress({
                current: i + 1,
                total: horses.length,
                currentHorse: horse.name,
                status: 'processing',
              })

              const detailData = await fetchTJKHorseDetail(horse.externalRef!)

              if (!detailData) {
                errors.push({ horseId: horse.id, name: horse.name, error: 'No data returned' })
                sendProgress({
                  current: i + 1,
                  total: horses.length,
                  currentHorse: horse.name,
                  processed: i + 1,
                  errors: errors.length,
                })
                continue
              }

              // Get current horse data to preserve existing pedigree if it's more complete
              const currentHorse = await prisma.horse.findUnique({
                where: { id: horse.id },
                select: { sireName: true, damName: true },
              })

              console.log(`[Fetch Details] Horse ${horse.name}: current sire="${currentHorse?.sireName || 'null'}", new sire="${detailData.sireName || 'null'}"`)
              console.log(`[Fetch Details] Horse ${horse.name}: current dam="${currentHorse?.damName || 'null'}", new dam="${detailData.damName || 'null'}"`)

              // Only update sireName/damName if:
              // 1. Current value is empty/null, OR
              // 2. New value is longer (more complete) than current value AND new value is at least 3 characters
              // This prevents overwriting correct values with truncated ones like "DA" or "PE"
              const shouldUpdateSire = !currentHorse?.sireName || 
                (detailData.sireName && 
                 detailData.sireName.length >= 3 && 
                 detailData.sireName.length > (currentHorse.sireName?.length || 0))
              const shouldUpdateDam = !currentHorse?.damName || 
                (detailData.damName && 
                 detailData.damName.length >= 3 && 
                 detailData.damName.length > (currentHorse.damName?.length || 0))

              console.log(`[Fetch Details] Horse ${horse.name}: shouldUpdateSire=${shouldUpdateSire}, shouldUpdateDam=${shouldUpdateDam}`)

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
                  // Only update pedigree if new values are more complete
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

              // Delete existing race history and create new
              if (detailData.races && detailData.races.length > 0) {
                await prisma.horseRaceHistory.deleteMany({
                  where: { horseId: horse.id },
                })

                await prisma.horseRaceHistory.createMany({
                  data: detailData.races.map((race) => {
                    // Parse date from DD.MM.YYYY format
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

              // Delete existing registrations and create new
              if (detailData.registrations && detailData.registrations.length > 0) {
                await prisma.horseRegistration.deleteMany({
                  where: { horseId: horse.id },
                })

                await prisma.horseRegistration.createMany({
                  data: detailData.registrations.map((reg) => {
                    // Parse date from DD.MM.YYYY format
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

              // Fetch and store all gallops for this horse
              try {
                const gallopsData = await fetchTJKHorseGallops(horse.externalRef!, horse.name)
                
                if (gallopsData && gallopsData.length > 0) {
                  // Delete existing gallops and create new
                  await prisma.horseGallop.deleteMany({
                    where: { horseId: horse.id },
                  })

                  await prisma.horseGallop.createMany({
                    data: gallopsData.map((gallop) => {
                      // Parse date from DD.MM.YYYY format
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
                        distances: gallop.distances || {}, // Store as JSON
                      }
                    }),
                  })
                  
                  console.log(`[Fetch Details] Stored ${gallopsData.length} gallops for ${horse.name}`)
                }
              } catch (gallopError: any) {
                console.error(`[Fetch Details] Error fetching gallops for ${horse.name}:`, gallopError.message)
                // Don't fail the whole process if gallops fail
              }

              // Fetch and store pedigree (4 generations) for this horse
              try {
                console.log(`[Fetch Details] Starting pedigree fetch for ${horse.name} (ID: ${horse.externalRef})`)
                const pedigreeData = await fetchTJKPedigree(horse.externalRef!, horse.name)
                
                console.log(`[Fetch Details] Pedigree data received for ${horse.name}:`, {
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
                  
                  await prisma.horse.update({
                    where: { id: horse.id },
                    data: updateData,
                  })
                  
                  console.log(`[Fetch Details] ✓ Stored pedigree data for ${horse.name} - Gen2: ${!!updateData.sireName && !!updateData.damName}, Gen3: ${[updateData.sireSire, updateData.sireDam, updateData.damSire, updateData.damDam].filter(Boolean).length}, Gen4: ${[updateData.sireSireSire, updateData.sireSireDam, updateData.sireDamSire, updateData.sireDamDam, updateData.damSireSire, updateData.damSireDam, updateData.damDamSire, updateData.damDamDam].filter(Boolean).length}`)
                } else {
                  console.log(`[Fetch Details] ⚠ No pedigree data returned for ${horse.name}`)
                }
              } catch (pedigreeError: any) {
                console.error(`[Fetch Details] ✗ Error fetching pedigree for ${horse.name}:`, pedigreeError.message)
                console.error(`[Fetch Details] Pedigree error stack:`, pedigreeError.stack)
                // Don't fail the whole process if pedigree fails
              }

              results.push({
                horseId: horse.id,
                name: horse.name,
                success: true,
                racesCount: detailData.races?.length || 0,
              })

              sendProgress({
                current: i + 1,
                total: horses.length,
                currentHorse: horse.name,
                processed: i + 1,
                success: results.length,
                errors: errors.length,
              })

              // Small delay between requests
              if (i < horses.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000))
              }

            } catch (error: any) {
              console.error(`[Fetch Details Stream] Error processing horse ${horse.name}:`, error.message)
              
              await prisma.horse.update({
                where: { id: horse.id },
                data: {
                  dataFetchError: error.message || 'Unknown error',
                },
              })

              errors.push({
                horseId: horse.id,
                name: horse.name,
                error: error.message || 'Unknown error',
              })

              sendProgress({
                current: i + 1,
                total: horses.length,
                currentHorse: horse.name,
                processed: i + 1,
                errors: errors.length,
              })
            }
          }

          // Send final result
          sendProgress({
            done: true,
            results,
            errors,
            total: horses.length,
            processed: results.length + errors.length,
          })

        } catch (error: any) {
          sendProgress({
            error: error.message || 'Fatal error',
            done: true,
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[Fetch Details Stream] Fatal error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch horse details' },
      { status: 500 }
    )
  }
}

