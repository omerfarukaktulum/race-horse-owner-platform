import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { fetchTJKOwnerRaces, filterRegistrationsAndDeclarations } from '@/lib/tjk-owner-races-scraper'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for scraping

/**
 * Get registrations and declarations for all horses owned by the user
 * Fetches directly from TJK using owner's external reference with QueryParameter_Kosmaz=on
 */
export async function GET(request: Request) {
  try {
    console.log('[Registrations API] Starting request')
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      console.log('[Registrations API] No auth token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      role: string
      ownerId?: string
      trainerId?: string
    }

    console.log('[Registrations API] User role:', decoded.role)

    // Get user's owner profile with external reference
    if (decoded.role !== 'OWNER') {
      console.log('[Registrations API] User is not owner, returning empty')
      return NextResponse.json({ registrations: [] })
    }

    let ownerId = decoded.ownerId
    if (!ownerId) {
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId: decoded.id },
      })
      ownerId = ownerProfile?.id
    }

    if (!ownerId) {
      console.log('[Registrations API] No owner profile found')
      return NextResponse.json({ registrations: [] })
    }

    // Get owner's external reference (TJK owner ID) and cache
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { id: ownerId },
      select: { 
        officialRef: true,
        registrationsCache: true,
        registrationsCacheAt: true,
      },
    })

    if (!ownerProfile?.officialRef) {
      console.log('[Registrations API] No external reference found for owner')
      return NextResponse.json({ registrations: [] })
    }

    // Check cache age (24 hours)
    const now = new Date()
    const cacheAge = ownerProfile.registrationsCacheAt 
      ? (now.getTime() - ownerProfile.registrationsCacheAt.getTime()) / 1000 / 60 / 60 
      : Infinity

    let registrationsAndDeclarations: any[] = []

    if (cacheAge < 24 && ownerProfile.registrationsCache) {
      // Use cached data
      console.log('[Registrations API] Using cached data (age:', cacheAge.toFixed(2), 'hours)')
      const cachedRaces = ownerProfile.registrationsCache as any[]
      registrationsAndDeclarations = filterRegistrationsAndDeclarations(cachedRaces)
    } else {
      // Fetch fresh data from TJK
      console.log('[Registrations API] Cache expired or missing, fetching from TJK for owner:', ownerProfile.officialRef)
      
      // Fetch all races with QueryParameter_Kosmaz=on to get registrations/declarations
      const allRaces = await fetchTJKOwnerRaces(ownerProfile.officialRef, true)
      
      // Update cache
      await prisma.ownerProfile.update({
        where: { id: ownerId },
        data: {
          registrationsCache: allRaces as any,
          registrationsCacheAt: now,
        },
      })
      
      // Filter to only future registrations/declarations (exclude cancellations)
      registrationsAndDeclarations = filterRegistrationsAndDeclarations(allRaces)
      
      console.log('[Registrations API] Fetched and cached', allRaces.length, 'races')
    }

    // Sort by date (earliest first)
    registrationsAndDeclarations.sort((a, b) => {
      const dateA = new Date(a.date.split('.').reverse().join('-'))
      const dateB = new Date(b.date.split('.').reverse().join('-'))
      return dateA.getTime() - dateB.getTime()
    })

    // Map to registrations format
    const registrations = registrationsAndDeclarations.map((race, index) => ({
      id: `reg-${index}`,
      horseName: race.horseName,
      raceDate: race.date,
      city: race.city,
      distance: race.distance,
      surface: race.surface,
      raceType: race.raceType,
      type: race.registrationStatus === 'Deklare' ? 'DEKLARE' as const : 'KAYIT' as const,
      jockeyName: race.jockeyName,
    }))

    console.log('[Registrations API] Returning', registrations.length, 'registrations')
    return NextResponse.json({ registrations })
  } catch (error) {
    console.error('[Registrations API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch registrations' },
      { status: 500 }
    )
  }
}

