import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

/**
 * Get recent races for all horses in the user's stablemate
 * Simply queries the database - no TJK fetching needed
 * Query params: limit (default 10)
 */
export async function GET(request: Request) {
  try {
    console.log('[Recent Races API] Starting request')
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      console.log('[Recent Races API] No auth token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      role: string
      ownerId?: string
      trainerId?: string
    }

    console.log('[Recent Races API] User role:', decoded.role)

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    let horseIds: string[] = []

    if (decoded.role === 'OWNER') {
      let ownerId = decoded.ownerId
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }

      if (!ownerId) {
        console.log('[Recent Races API] No owner profile found')
        return NextResponse.json({ races: [] })
      }

      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { id: ownerId },
        select: {
          stablemate: {
            select: {
              horses: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      })

      if (!ownerProfile?.stablemate) {
        console.log('[Recent Races API] No stablemate found for owner')
        return NextResponse.json({ races: [] })
      }

      horseIds = ownerProfile.stablemate.horses.map((h) => h.id)
    } else if (decoded.role === 'TRAINER') {
      let trainerId = decoded.trainerId
      if (!trainerId) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
          where: { userId: decoded.id },
          select: { id: true },
        })
        trainerId = trainerProfile?.id
      }

      if (!trainerId) {
        console.log('[Recent Races API] Trainer profile not found')
        return NextResponse.json({ races: [] })
      }

      const trainerHorses = await prisma.horse.findMany({
        where: { trainerId },
        select: { id: true },
      })
      horseIds = trainerHorses.map((horse) => horse.id)
    } else {
      console.log('[Recent Races API] Unsupported role')
      return NextResponse.json({ races: [] })
    }
    
    if (horseIds.length === 0) {
      console.log('[Recent Races API] No horses in stablemate')
      return NextResponse.json({ races: [] })
    }

    console.log('[Recent Races API] Fetching races for', horseIds.length, 'horses in stablemate')

    // Get all race history for horses in stablemate, sorted by date (most recent first)
    const raceHistory = await prisma.horseRaceHistory.findMany({
      where: {
        horseId: {
          in: horseIds,
        },
        // Only past races (raceDate < today)
        raceDate: {
          lt: new Date(),
        },
      },
      include: {
        horse: {
          select: {
            name: true,
            ...(decoded.role === 'TRAINER' ? {
              stablemate: {
                select: {
                  id: true,
                  name: true,
                },
              },
            } : {}),
          },
        },
      },
      orderBy: {
        raceDate: 'desc',
      },
      take: limit,
    })

    console.log('[Recent Races API] Found', raceHistory.length, 'recent races')

    // Convert to the format expected by the frontend
    const races = raceHistory.map((race) => {
      // Format date from Date object to DD.MM.YYYY
      const date = new Date(race.raceDate)
      const formattedDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
      
      // Format surface - use surfaceType if available (e.g., "Ç:Normal 3.3"), otherwise use surface (e.g., "Çim")
      let surface: string | undefined
      if (race.surfaceType) {
        surface = race.surfaceType
      } else if (race.surface) {
        surface = race.surface
      }
      
      // Format prize money (remove decimals if .00)
      let prizeMoney: string | undefined
      if (race.prizeMoney) {
        const amount = Number(race.prizeMoney)
        if (amount > 0) {
          prizeMoney = Math.floor(amount).toString()
        }
      }
      
      return {
        raceId: race.id,
        horseId: race.horseId,
        date: formattedDate,
        horseName: race.horse.name,
        ...(decoded.role === 'TRAINER' && race.horse.stablemate ? {
          stablemate: {
            id: race.horse.stablemate.id,
            name: race.horse.stablemate.name,
          },
        } : {}),
        city: race.city || '',
        distance: race.distance || undefined,
        surface: surface || undefined,
        position: race.position || undefined,
        raceType: race.raceType || undefined,
        prizeMoney: prizeMoney || undefined,
        jockeyName: race.jockeyName || undefined,
      }
    })

    console.log('[Recent Races API] Returning', races.length, 'recent races')

    return NextResponse.json({ races })
  } catch (error) {
    console.error('[Recent Races API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent races' },
      { status: 500 }
    )
  }
}
