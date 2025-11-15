import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { fetchTJKHorseGallops, GallopData, filterGallopsByDays } from '@/lib/tjk-gallops-scraper'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for scraping multiple horses

/**
 * Get gallops for all horses in the user's stablemate
 * Uses 24-hour caching like registrations and races
 */
export async function GET(request: Request) {
  try {
    console.log('[Gallops API] Starting request')
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      console.log('[Gallops API] No auth token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      role: string
      ownerId?: string
      trainerId?: string
    }

    console.log('[Gallops API] User role:', decoded.role)

    // Get user's owner profile
    if (decoded.role !== 'OWNER') {
      console.log('[Gallops API] User is not owner, returning empty')
      return NextResponse.json({ gallops: [] })
    }

    let ownerId = decoded.ownerId
    if (!ownerId) {
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId: decoded.id },
      })
      ownerId = ownerProfile?.id
    }

    if (!ownerId) {
      console.log('[Gallops API] No owner profile found')
      return NextResponse.json({ gallops: [] })
    }

    // Get owner profile with cache
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { id: ownerId },
      select: { 
        gallopsCache: true,
        gallopsCacheAt: true,
      },
    })

    // Check cache age (24 hours)
    const now = new Date()
    const cacheAge = ownerProfile?.gallopsCacheAt 
      ? (now.getTime() - ownerProfile.gallopsCacheAt.getTime()) / 1000 / 60 / 60 
      : Infinity

    let allGallops: GallopData[] = []

    if (cacheAge < 24 && ownerProfile?.gallopsCache) {
      // Use cached data
      console.log('[Gallops API] Using cached data (age:', cacheAge.toFixed(2), 'hours)')
      const cachedGallops = ownerProfile.gallopsCache as any[]
      allGallops = cachedGallops
    } else {
      // Fetch fresh data
      console.log('[Gallops API] Cache expired or missing, fetching from TJK')
      
      // Get user's stablemate
      const stablemate = await prisma.stablemate.findUnique({
        where: { ownerId },
      })

      if (!stablemate) {
        console.log('[Gallops API] No stablemate found')
        return NextResponse.json({ gallops: [] })
      }

      // Get all horses for this stablemate with external refs
      const horses = await prisma.horse.findMany({
        where: { 
          stablemateId: stablemate.id,
          externalRef: {
            not: null,
          },
        },
        select: {
          id: true,
          name: true,
          externalRef: true,
        },
      })

      console.log('[Gallops API] Fetching gallops for', horses.length, 'horses')

      // Fetch gallops for each horse (fetch all, no days filter)
      for (const horse of horses) {
        if (!horse.externalRef) continue

        try {
          console.log('[Gallops API] Fetching gallops for horse:', horse.name)
          // Fetch all gallops (pass large number to disable filtering - we'll cache everything)
          const gallops = await fetchTJKHorseGallops(horse.externalRef, horse.name, 3650) // Pass 10 years to effectively fetch all
          
          allGallops.push(...gallops)
        } catch (error) {
          console.error('[Gallops API] Error fetching gallops for horse:', horse.name, error)
          // Continue with other horses even if one fails
        }
      }

      // Sort by date (most recent first)
      allGallops.sort((a, b) => {
        const dateA = parseGallopDate(a.date)
        const dateB = parseGallopDate(b.date)
        return dateB.getTime() - dateA.getTime()
      })

      // Cache the results
      await prisma.ownerProfile.update({
        where: { id: ownerId },
        data: {
          gallopsCache: allGallops as any,
          gallopsCacheAt: now,
        },
      })

      console.log('[Gallops API] Fetched and cached', allGallops.length, 'gallops')
    }

    // Filter to show only last 14 days for display (but cache has all data)
    const recentGallops = filterGallopsByDays(allGallops, 14)

    console.log('[Gallops API] Returning', recentGallops.length, 'recent gallops (from', allGallops.length, 'total)')

    return NextResponse.json({ gallops: recentGallops })
  } catch (error) {
    console.error('[Gallops API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gallops' },
      { status: 500 }
    )
  }
}

function parseGallopDate(dateStr: string): Date {
  // Parse DD.MM.YYYY format
  const parts = dateStr.split('.')
  if (parts.length !== 3) return new Date()
  
  return new Date(
    parseInt(parts[2]),
    parseInt(parts[1]) - 1,
    parseInt(parts[0])
  )
}

