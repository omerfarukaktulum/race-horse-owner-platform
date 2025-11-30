import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { horseSchema } from '@/lib/validation/schemas'

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      console.log('[Horses API] No auth token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      role: string
      ownerId?: string
      trainerId?: string
    }

    console.log('[Horses API] Decoded token:', { role: decoded.role, ownerId: decoded.ownerId })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build query based on role
    let where: any = {}

    if (decoded.role === 'OWNER') {
      // Optimized: Single query regardless of whether ownerId is in token
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: decoded.ownerId 
          ? { id: decoded.ownerId }
          : { userId: decoded.id },
        include: { stablemate: true },
      })

      console.log('[Horses API] Owner profile:', {
        hasOwnerProfile: !!ownerProfile,
        hasStablemate: !!ownerProfile?.stablemate,
        stablemateId: ownerProfile?.stablemate?.id,
      })

      if (!ownerProfile) {
        console.log('[Horses API] No owner profile found - onboarding not completed')
        return NextResponse.json({ horses: [], message: 'Onboarding not completed' })
      }

      if (!ownerProfile.stablemate) {
        console.log('[Horses API] No stablemate found for owner')
        return NextResponse.json({ horses: [], message: 'No stablemate found' })
      }

      where.stablemateId = ownerProfile.stablemate.id
      console.log('[Horses API] Querying horses with where:', where)
    } else if (decoded.role === 'TRAINER') {
      if (!decoded.trainerId) {
        console.log('[Horses API] Trainer has no trainerId')
        return NextResponse.json({ horses: [], message: 'Trainer profile not found' })
      }
      // Trainer sees assigned horses
      where.trainerId = decoded.trainerId
    } else if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Filter by status if provided
    if (status) {
      where.status = status
    }

    const horses = await prisma.horse.findMany({
      where,
      include: {
        racecourse: true,
        farm: true,
        trainer: {
          include: {
            user: true,
          },
        },
        ...(decoded.role === 'TRAINER' ? {
          stablemate: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  officialName: true,
                },
              },
            },
          },
        } : {}),
        expenses: {
          orderBy: { date: 'desc' },
          take: 1,
          select: {
            date: true,
            amount: true,
            currency: true,
            createdAt: true,
          },
        },
        locationHistory: {
          where: {
            endDate: null, // Current location
          },
          take: 1,
          orderBy: { startDate: 'desc' },
        },
        // Fetch all illnesses to check for active ones (no endDate)
        illnesses: {
          select: {
            id: true,
            detail: true,
            startDate: true,
            endDate: true,
            operations: {
              select: {
                id: true,
              },
            },
          },
        },
        // Fetch all banned medicines to check for active ones (remaining wait days > 0)
        bannedMedicines: {
          select: {
            id: true,
            medicineName: true,
            givenDate: true,
            waitDays: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    // Get total count for pagination
    const totalCount = await prisma.horse.count({ where })

    console.log('[Horses API] Found', horses.length, 'horses')
    const horsesWithExternalRef = horses.filter(h => h.externalRef)
    console.log('[Horses API] Horses with externalRef:', horsesWithExternalRef.length, 'out of', horses.length)
    if (horsesWithExternalRef.length > 0) {
      console.log('[Horses API] Sample horses with externalRef:', horsesWithExternalRef.slice(0, 3).map(h => ({ name: h.name, externalRef: h.externalRef })))
    }

    // Log pedigree data for debugging
    if (horses.length > 0) {
      horses.slice(0, 3).forEach((h, i) => {
        console.log(`[Horses API] Horse ${i + 1} (${h.name}): sireName="${h.sireName || 'null'}", damName="${h.damName || 'null'}"`)
      })
    }

    // Map horses to include current location info
    const horsesWithLocation = horses.map((horse) => {
      const currentLocation = horse.locationHistory[0]
      // Fallback: if no location history, use racecourseId or farmId from horse table
      let locationType: 'racecourse' | 'farm' | undefined = currentLocation?.locationType
      if (!locationType) {
        if (horse.racecourseId) {
          locationType = 'racecourse'
        } else if (horse.farmId) {
          locationType = 'farm'
        }
      }
      return {
        ...horse,
        currentLocationType: locationType,
        currentCity: currentLocation?.city,
      }
    })

    return NextResponse.json({ 
      horses: horsesWithLocation,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + horsesWithLocation.length < totalCount,
      },
    })
  } catch (error) {
    console.error('Get horses error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch horses' },
      { status: 500 }
    )
  }
}

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
      ownerId?: string
    }

    // Only owner and admin can create horses
    if (decoded.role !== 'OWNER' && decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Validate input
    const validation = horseSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Get stablemate
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { id: decoded.ownerId },
      include: { stablemate: true },
    })

    if (!ownerProfile?.stablemate) {
      return NextResponse.json(
        { error: 'Stablemate not found' },
        { status: 404 }
      )
    }

    const horse = await prisma.horse.create({
      data: {
        ...validation.data,
        stablemateId: ownerProfile.stablemate.id,
      },
      include: {
        racecourse: true,
        farm: true,
        trainer: {
          include: {
            user: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, horse })
  } catch (error) {
    console.error('Create horse error:', error)
    return NextResponse.json(
      { error: 'Failed to create horse' },
      { status: 500 }
    )
  }
}

