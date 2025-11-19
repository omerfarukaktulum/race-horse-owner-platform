import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

/**
 * Get gallops for all horses in the user's stablemate
 * Note: This currently returns empty array as gallops are not yet stored in database.
 * A scheduler job will be added later to fetch and store gallops permanently.
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
      console.log('[Gallops API] No stablemate found for owner')
      return NextResponse.json({ gallops: [] })
    }

    const horseIds = ownerProfile.stablemate.horses.map((h: any) => h.id)
    
    if (horseIds.length === 0) {
      console.log('[Gallops API] No horses in stablemate')
      return NextResponse.json({ gallops: [] })
    }

    console.log('[Gallops API] Fetching gallops for', horseIds.length, 'horses in stablemate')

    // Get all gallops for horses in stablemate, sorted by date (most recent first)
    const gallops = await prisma.horseGallop.findMany({
      where: {
        horseId: {
          in: horseIds,
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
        gallopDate: 'desc',
      },
      take: 20, // Limit to 20 most recent gallops
    })

    console.log('[Gallops API] Found', gallops.length, 'gallops')

    // Convert to the format expected by the frontend
    const formattedGallops = gallops.map((gallop: any) => {
      // Format date from Date object to DD.MM.YYYY
      const date = new Date(gallop.gallopDate)
      const formattedDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
      
      return {
        id: gallop.id,
        horseId: gallop.horseId,
        horseName: gallop.horse.name,
        date: formattedDate,
        distances: gallop.distances || {},
        status: gallop.status || undefined,
        racecourse: gallop.racecourse || undefined,
        surface: gallop.surface || undefined,
        jockeyName: gallop.jockeyName || undefined,
      }
    })

    console.log('[Gallops API] Returning', formattedGallops.length, 'gallops')

    return NextResponse.json({ gallops: formattedGallops })
  } catch (error) {
    console.error('[Gallops API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gallops' },
      { status: 500 }
    )
  }
}
