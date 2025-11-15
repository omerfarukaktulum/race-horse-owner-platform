import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

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

    // Get owner profile to find all their horses
    let ownerId = decoded.ownerId
    if (!ownerId && decoded.role === 'OWNER') {
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId: decoded.id },
      })
      ownerId = ownerProfile?.id
    }

    if (!ownerId) {
      return NextResponse.json({ error: 'Owner profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { locationType, city, startDate, notes } = body

    if (!locationType || !city) {
      return NextResponse.json(
        { error: 'Location type and city are required' },
        { status: 400 }
      )
    }

    if (locationType !== 'racecourse' && locationType !== 'farm') {
      return NextResponse.json(
        { error: 'Location type must be either "racecourse" or "farm"' },
        { status: 400 }
      )
    }

    // Get all horses owned by this owner that don't have a current location
    const stablemate = await prisma.stablemate.findFirst({
      where: { ownerId },
    })

    if (!stablemate) {
      return NextResponse.json({ error: 'Stablemate not found' }, { status: 404 })
    }

    const horses = await prisma.horse.findMany({
      where: {
        stablemateId: stablemate.id,
        // Only update horses without current location or with very recent creation
        // (horses just imported during onboarding)
        OR: [
          {
            racecourseId: null,
            farmId: null,
          },
          {
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000), // Created in last 5 minutes
            },
          },
        ],
      },
    })

    if (horses.length === 0) {
      return NextResponse.json({ error: 'No horses found to update' }, { status: 404 })
    }

    // Try to find matching racecourse or farm by name/city for linking
    let racecourseId: string | null = null
    let farmId: string | null = null

    if (locationType === 'racecourse') {
      const racecourse = await prisma.racecourse.findFirst({
        where: {
          name: {
            contains: city,
            mode: 'insensitive',
          },
        },
      })
      if (racecourse) {
        racecourseId = racecourse.id
      }
    } else if (locationType === 'farm') {
      const farm = await prisma.farm.findFirst({
        where: {
          city: {
            equals: city,
            mode: 'insensitive',
          },
        },
      })
      if (farm) {
        farmId = farm.id
      }
    }

    // Update all horses
    let updatedCount = 0
    for (const horse of horses) {
      // End the current location history entry if it exists
      const currentLocation = await prisma.horseLocationHistory.findFirst({
        where: {
          horseId: horse.id,
          endDate: null,
        },
      })

      if (currentLocation) {
        await prisma.horseLocationHistory.update({
          where: { id: currentLocation.id },
          data: {
            endDate: new Date(startDate),
          },
        })
      }

      // Create new location history entry
      await prisma.horseLocationHistory.create({
        data: {
          horseId: horse.id,
          locationType,
          city,
          racecourseId,
          farmId,
          startDate: new Date(startDate),
          endDate: null,
          notes: notes && notes.trim() ? notes.trim() : null,
        },
      })

      // Update horse's current location
      await prisma.horse.update({
        where: { id: horse.id },
        data: {
          racecourseId: locationType === 'racecourse' ? racecourseId : null,
          farmId: locationType === 'farm' ? farmId : null,
        },
      })

      updatedCount++
    }

    return NextResponse.json({
      success: true,
      updatedCount,
    })
  } catch (error) {
    console.error('Set locations error:', error)
    return NextResponse.json(
      { error: 'Failed to set locations' },
      { status: 500 }
    )
  }
}

