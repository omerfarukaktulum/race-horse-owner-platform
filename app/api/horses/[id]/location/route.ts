import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json()
    const { locationType, racecourseId, farmId, startDate } = body

    // Get horse with relations
    const horse = await prisma.horse.findUnique({
      where: { id: params.id },
      include: {
        stablemate: {
          include: {
            owner: true,
          },
        },
        trainer: true,
      },
    })

    if (!horse) {
      return NextResponse.json({ error: 'Horse not found' }, { status: 404 })
    }

    // Check authorization
    let hasAccess = false
    if (decoded.role === 'ADMIN') {
      hasAccess = true
    } else if (decoded.role === 'OWNER') {
      let ownerId = decoded.ownerId
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }
      hasAccess = ownerId ? horse.stablemate.ownerId === ownerId : false
    } else if (decoded.role === 'TRAINER') {
      let trainerId = decoded.trainerId
      if (!trainerId) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
          where: { userId: decoded.id },
        })
        trainerId = trainerProfile?.id
      }
      hasAccess = trainerId ? horse.trainerId === trainerId : false
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // End the current location history entry if it exists
    const currentLocation = await prisma.horseLocationHistory.findFirst({
      where: {
        horseId: params.id,
        endDate: null, // Current location
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
    const newLocation = await prisma.horseLocationHistory.create({
      data: {
        horseId: params.id,
        racecourseId: locationType === 'racecourse' ? racecourseId : null,
        farmId: locationType === 'farm' ? farmId : null,
        startDate: new Date(startDate),
        endDate: null, // Current location
      },
      include: {
        racecourse: true,
        farm: true,
      },
    })

    // Update horse's current location
    await prisma.horse.update({
      where: { id: params.id },
      data: {
        racecourseId: locationType === 'racecourse' ? racecourseId : null,
        farmId: locationType === 'farm' ? farmId : null,
      },
    })

    return NextResponse.json({
      success: true,
      location: newLocation,
    })
  } catch (error) {
    console.error('Change location error:', error)
    return NextResponse.json(
      { error: 'Failed to change location' },
      { status: 500 }
    )
  }
}

