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

    // Get user's owner profile
    if (decoded.role !== 'OWNER') {
      console.log('[Recent Races API] User is not owner, returning empty')
      return NextResponse.json({ races: [] })
    }

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

    // Get stablemate with horses
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { id: ownerId },
      select: {
        stablemate: {
          select: {
            id: true,
            horses: {
              select: {
                id: true,
                name: true,
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

    const horseIds = ownerProfile.stablemate.horses.map((h: any) => h.id)
    
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
        horseId: race.horseId,
        date: formattedDate,
        horseName: race.horse.name,
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
