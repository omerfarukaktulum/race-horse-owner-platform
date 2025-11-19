import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

/**
 * Get registrations and declarations for all horses in the user's stablemate
 * Queries the database - no TJK fetching needed
 */

const buildTjkUrl = (horseTjkId: string | null | undefined): string | undefined => {
  if (!horseTjkId) {
    return undefined
  }
  
  return `https://www.tjk.org/TR/YarisSever/Info/Page/Kayitlar?QueryParameter_AtId=${horseTjkId}`
}

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

    // Get user's owner profile
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
      console.log('[Registrations API] No stablemate found for owner')
      return NextResponse.json({ registrations: [] })
    }

    const horseIds = ownerProfile.stablemate.horses.map((h: any) => h.id)
    
    if (horseIds.length === 0) {
      console.log('[Registrations API] No horses in stablemate')
      return NextResponse.json({ registrations: [] })
    }

    console.log('[Registrations API] Fetching registrations for', horseIds.length, 'horses in stablemate')

    // Get all registrations/declarations for horses in stablemate, sorted by date (earliest first)
    const registrations = await prisma.horseRegistration.findMany({
      where: {
        horseId: {
          in: horseIds,
        },
        // Only future races (raceDate >= today)
        raceDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      include: {
        horse: {
          select: {
            name: true,
            externalRef: true,
          },
        },
      },
      orderBy: {
        raceDate: 'asc',
      },
    })

    console.log('[Registrations API] Found', registrations.length, 'registrations/declarations')

    // Convert to the format expected by the frontend
    const formattedRegistrations = registrations.map((reg: any, index: number) => {
      // Format date from Date object to DD.MM.YYYY
      const date = new Date(reg.raceDate)
      const formattedDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
      
      // Format surface - use surfaceType if available, otherwise use surface
      let surface: string | undefined
      if (reg.surfaceType) {
        surface = reg.surfaceType
      } else if (reg.surface) {
        surface = reg.surface
      }
      
      return {
        id: `reg-${index}`,
        horseName: reg.horse.name,
        raceDate: formattedDate,
        city: reg.city || undefined,
        distance: reg.distance || undefined,
        surface: surface || undefined,
        raceType: reg.raceType || undefined,
        type: reg.type === 'Deklare' ? ('DEKLARE' as const) : ('KAYIT' as const),
        jockeyName: reg.jockeyName || undefined,
        tjkUrl: buildTjkUrl(reg.horse.externalRef),
      }
    })

    console.log('[Registrations API] Returning', formattedRegistrations.length, 'registrations')

    return NextResponse.json({ registrations: formattedRegistrations })
  } catch (error) {
    console.error('[Registrations API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch registrations' },
      { status: 500 }
    )
  }
}
