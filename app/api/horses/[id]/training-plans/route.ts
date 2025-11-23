import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function GET(
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

    const horseId = params.id

    // Verify horse exists and user has access
    const horse = await prisma.horse.findUnique({
      where: { id: horseId },
      include: {
        stablemate: true,
      },
    })

    if (!horse) {
      return NextResponse.json({ error: 'Horse not found' }, { status: 404 })
    }

    // Check access rights
    if (decoded.role === 'OWNER') {
      let ownerId = decoded.ownerId
      
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }
      
      if (!ownerId || horse.stablemate.ownerId !== ownerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role === 'TRAINER') {
      let trainerId = decoded.trainerId
      
      if (!trainerId) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
          where: { userId: decoded.id },
        })
        trainerId = trainerProfile?.id
      }
      
      if (!trainerId || horse.trainerId !== trainerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch training plans
    const plans = await prisma.horseTrainingPlan.findMany({
      where: { horseId },
      include: {
        addedBy: {
          include: {
            ownerProfile: {
              select: {
                officialName: true,
              },
            },
            trainerProfile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        planDate: 'asc', // Future dates first
      },
    })

    return NextResponse.json({ plans })
  } catch (error: any) {
    console.error('Error fetching training plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training plans', message: error.message },
      { status: 500 }
    )
  }
}

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

    const horseId = params.id
    const body = await request.json()
    const { planDate, distance, note } = body

    // Validate required fields
    if (!planDate || !distance) {
      return NextResponse.json(
        { error: 'Plan date and distance are required' },
        { status: 400 }
      )
    }

    // Validate date is in the future
    const selectedDate = new Date(planDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate <= today) {
      return NextResponse.json(
        { error: 'Plan date must be in the future' },
        { status: 400 }
      )
    }

    // Validate distance
    const validDistances = ['Kenter', 'Tırıs', '200', '400', '600', '800', '1000', '1200', '1400', '1600']
    if (!validDistances.includes(distance)) {
      return NextResponse.json(
        { error: 'Invalid distance value' },
        { status: 400 }
      )
    }

    // Verify horse exists and user has access
    const horse = await prisma.horse.findUnique({
      where: { id: horseId },
      include: {
        stablemate: true,
      },
    })

    if (!horse) {
      return NextResponse.json({ error: 'Horse not found' }, { status: 404 })
    }

    // Check access rights
    if (decoded.role === 'OWNER') {
      let ownerId = decoded.ownerId
      
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }
      
      if (!ownerId || horse.stablemate.ownerId !== ownerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role === 'TRAINER') {
      let trainerId = decoded.trainerId
      
      if (!trainerId) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
          where: { userId: decoded.id },
        })
        trainerId = trainerProfile?.id
      }
      
      if (!trainerId || horse.trainerId !== trainerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create training plan
    const plan = await prisma.horseTrainingPlan.create({
      data: {
        horseId,
        planDate: new Date(planDate),
        distance,
        note: note?.trim() || null,
        addedById: decoded.id,
      },
      include: {
        addedBy: {
          include: {
            ownerProfile: {
              select: {
                officialName: true,
              },
            },
            trainerProfile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating training plan:', error)
    return NextResponse.json(
      { error: 'Failed to create training plan', message: error.message },
      { status: 500 }
    )
  }
}

