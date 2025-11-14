import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { fetchTJKHorseGallops, GallopData } from '@/lib/tjk-gallops-scraper'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for scraping multiple horses

/**
 * Get gallops for all horses in the user's stablemate
 * Query params: days (default 7)
 */
export async function GET(request: Request) {
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    // Get user's stablemate
    let stablemateId: string | null = null

    if (decoded.role === 'OWNER') {
      let ownerId = decoded.ownerId
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }

      if (ownerId) {
        const stablemate = await prisma.stablemate.findUnique({
          where: { ownerId },
        })
        stablemateId = stablemate?.id || null
      }
    } else if (decoded.role === 'TRAINER') {
      // For trainers, we could show horses they train
      // For now, return empty array
      return NextResponse.json({ gallops: [] })
    } else if (decoded.role === 'ADMIN') {
      // Admins might need a different approach
      return NextResponse.json({ gallops: [] })
    }

    if (!stablemateId) {
      return NextResponse.json({ gallops: [] })
    }

    // Get all horses for this stablemate with external refs
    const horses = await prisma.horse.findMany({
      where: { 
        stablemateId,
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

    const allGallops: GallopData[] = []

    // Fetch gallops for each horse
    for (const horse of horses) {
      if (!horse.externalRef) continue

      try {
        console.log('[Gallops API] Fetching gallops for horse:', horse.name, 'last', days, 'days')
        // Fetch only last X days (filtering happens in scraper)
        const gallops = await fetchTJKHorseGallops(horse.externalRef, horse.name, days)
        
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

    console.log('[Gallops API] Returning', allGallops.length, 'gallops')

    return NextResponse.json({ gallops: allGallops })
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

