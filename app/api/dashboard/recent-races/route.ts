import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { fetchTJKOwnerRaces, filterPastRaces, filterRecentRaces } from '@/lib/tjk-owner-races-scraper'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for scraping

/**
 * Get recent races for all horses owned by the user
 * Fetches directly from TJK using owner's external reference
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

    // Get user's owner profile with external reference
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

    // Get owner's external reference (TJK owner ID) and cache
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { id: ownerId },
      select: { 
        officialRef: true,
        racesCache: true,
        racesCacheAt: true,
      },
    })

    if (!ownerProfile?.officialRef) {
      console.log('[Recent Races API] No external reference found for owner')
      return NextResponse.json({ races: [] })
    }

    // Check cache age (24 hours)
    const now = new Date()
    const cacheAge = ownerProfile.racesCacheAt 
      ? (now.getTime() - ownerProfile.racesCacheAt.getTime()) / 1000 / 60 / 60 
      : Infinity

    let recentRaces: any[] = []

    if (cacheAge < 24 && ownerProfile.racesCache) {
      // Use cached data
      console.log('[Recent Races API] Using cached data (age:', cacheAge.toFixed(2), 'hours)')
      const cachedRaces = ownerProfile.racesCache as any[]
      const pastRaces = filterPastRaces(cachedRaces)
      recentRaces = filterRecentRaces(pastRaces, limit)
    } else {
      // Fetch fresh data from TJK
      console.log('[Recent Races API] Cache expired or missing, fetching from TJK for owner:', ownerProfile.officialRef)
      
      const allRaces = await fetchTJKOwnerRaces(ownerProfile.officialRef, false)
      
      // Update cache
      await prisma.ownerProfile.update({
        where: { id: ownerId },
        data: {
          racesCache: allRaces as any,
          racesCacheAt: now,
        },
      })
      
      // Filter to only past races
      const pastRaces = filterPastRaces(allRaces)
      
      // Get most recent races
      recentRaces = filterRecentRaces(pastRaces, limit)
      
      console.log('[Recent Races API] Fetched and cached', allRaces.length, 'races')
    }

    console.log('[Recent Races API] Returning', recentRaces.length, 'recent races')

    return NextResponse.json({ races: recentRaces })
  } catch (error) {
    console.error('[Recent Races API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent races' },
      { status: 500 }
    )
  }
}

