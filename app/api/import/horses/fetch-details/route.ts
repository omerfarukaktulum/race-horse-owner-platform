import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { fetchTJKHorseDetail } from '@/lib/tjk-horse-detail-scraper'

/**
 * Fetch detailed data for multiple horses
 * This endpoint processes horses one by one and returns progress
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
      return NextResponse.json({ error: 'Owner profile not found' }, { status: 403 })
    }

    const results = []
    const errors = []

    // Process each horse
    for (let i = 0; i < horses.length; i++) {
      const horse = horses[i]
      
      // Verify ownership
      if (horse.stablemate.ownerId !== ownerProfile.id) {
        errors.push({ horseId: horse.id, name: horse.name, error: 'Not authorized' })
        continue
      }

      try {
        console.log(`[Fetch Details API] Processing horse ${i + 1}/${horses.length}:`, horse.name, 'ID:', horse.externalRef)
        
        const detailData = await fetchTJKHorseDetail(horse.externalRef!)

        if (!detailData) {
          errors.push({ horseId: horse.id, name: horse.name, error: 'No data returned' })
          continue
        }

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
            data: detailData.races.map((race) => {
              // Parse date from DD.MM.YYYY format
              let raceDate = new Date()
              if (race.raceDate && race.raceDate.match(/\d{2}\.\d{2}\.\d{4}/)) {
                const dateParts = race.raceDate.split('.')
                if (dateParts.length === 3) {
                  // Format: YYYY-MM-DD for Date constructor
                  raceDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`)
                  // Validate the date
                  if (isNaN(raceDate.getTime())) {
                    console.warn('[Fetch Details API] Invalid date:', race.raceDate)
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

        results.push({
          horseId: horse.id,
          name: horse.name,
          success: true,
          racesCount: detailData.races?.length || 0,
        })

        console.log(`[Fetch Details API] Successfully processed horse ${i + 1}/${horses.length}:`, horse.name)

        // Small delay between requests to avoid overwhelming TJK
        if (i < horses.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (error: any) {
        console.error(`[Fetch Details API] Error processing horse ${horse.name}:`, error.message)
        
        // Update horse with error
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
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      total: horses.length,
      results,
      errors,
    })
  } catch (error) {
    console.error('[Fetch Details API] Fatal error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch horse details' },
      { status: 500 }
    )
  }
}

