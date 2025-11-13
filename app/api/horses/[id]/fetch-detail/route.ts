import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { fetchTJKHorseDetail } from '@/lib/tjk-horse-detail-scraper'

/**
 * Fetch detailed horse data from TJK and store it in the database
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      role: string
      ownerId?: string
      trainerId?: string
    }

    // Get horse
    const horse = await prisma.horse.findUnique({
      where: { id: params.id },
      include: {
        stablemate: {
          include: {
            owner: true,
          },
        },
      },
    })

    if (!horse) {
      return NextResponse.json({ error: 'Horse not found' }, { status: 404 })
    }

    if (!horse.externalRef) {
      return NextResponse.json(
        { error: 'Horse does not have TJK ID (externalRef)' },
        { status: 400 }
      )
    }

    // Check authorization
    let hasAccess = false
    if (decoded.role === 'ADMIN') {
      hasAccess = true
    } else if (decoded.role === 'OWNER') {
      let ownerId = decoded.ownerId
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }
      hasAccess = ownerId ? horse.stablemate.ownerId === ownerId : false
    } else if (decoded.role === 'TRAINER') {
      let trainerId = decoded.trainerId
      if (!trainerId) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
          where: { userId: decoded.id },
        })
        trainerId = trainerProfile?.id
      }
      hasAccess = trainerId ? horse.trainerId === trainerId : false
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch detailed data from TJK
    console.log('[Fetch Detail API] Fetching data for horse:', horse.name, 'ID:', horse.externalRef)
    const detailData = await fetchTJKHorseDetail(horse.externalRef)

    if (!detailData) {
      return NextResponse.json(
        { error: 'Failed to fetch horse detail data' },
        { status: 500 }
      )
    }

    // Update horse with detailed data
    const updatedHorse = await prisma.horse.update({
      where: { id: params.id },
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

    // Create race history records
    if (detailData.races && detailData.races.length > 0) {
      // Delete existing race history
      await prisma.horseRaceHistory.deleteMany({
        where: { horseId: params.id },
      })

      // Create new race history records
      await prisma.horseRaceHistory.createMany({
        data: detailData.races.map((race) => ({
          horseId: params.id,
          raceDate: new Date(race.raceDate.split('.').reverse().join('-')), // Convert DD.MM.YYYY to Date
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
        })),
      })
    }

    console.log('[Fetch Detail API] Successfully updated horse with detailed data')

    return NextResponse.json({
      success: true,
      horse: updatedHorse,
      racesCount: detailData.races?.length || 0,
    })
  } catch (error) {
    console.error('[Fetch Detail API] Error:', error)
    
    // Update horse with error
    try {
      await prisma.horse.update({
        where: { id: params.id },
        data: {
          dataFetchError: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    } catch (updateError) {
      console.error('[Fetch Detail API] Error updating horse with error:', updateError)
    }

    return NextResponse.json(
      { error: 'Failed to fetch horse detail data' },
      { status: 500 }
    )
  }
}


