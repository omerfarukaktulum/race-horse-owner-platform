import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; planId: string } }
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
    const planId = params.planId
    const body = await request.json()
    const { planDate, distance, note, racecourseId } = body

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

    // Verify plan exists and belongs to the horse
    const existingPlan = await prisma.horseTrainingPlan.findUnique({
      where: { id: planId },
      include: {
        horse: {
          include: {
            stablemate: {
              include: {
                owner: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            trainer: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    })

    if (!existingPlan) {
      return NextResponse.json({ error: 'Training plan not found' }, { status: 404 })
    }

    if (existingPlan.horseId !== horseId) {
      return NextResponse.json({ error: 'Plan does not belong to this horse' }, { status: 400 })
    }

    // Check access rights
    const horse = existingPlan.horse
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

    // Update training plan
    const plan = await prisma.horseTrainingPlan.update({
      where: { id: planId },
      data: {
        planDate: new Date(planDate),
        distance,
        note: note?.trim() || null,
        racecourseId: racecourseId || null,
      },
      include: {
        racecourse: {
          select: {
            id: true,
            name: true,
          },
        },
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

    return NextResponse.json({ plan })
  } catch (error: any) {
    console.error('Error updating training plan:', error)
    return NextResponse.json(
      { error: 'Failed to update training plan', message: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; planId: string } }
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
    const planId = params.planId

    // Verify plan exists and belongs to the horse
    const existingPlan = await prisma.horseTrainingPlan.findUnique({
      where: { id: planId },
      include: {
        horse: {
          include: {
            stablemate: {
              include: {
                owner: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            trainer: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    })

    if (!existingPlan) {
      return NextResponse.json({ error: 'Training plan not found' }, { status: 404 })
    }

    if (existingPlan.horseId !== horseId) {
      return NextResponse.json({ error: 'Plan does not belong to this horse' }, { status: 400 })
    }

    // Check access rights
    const horse = existingPlan.horse
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

    // Delete training plan
    await prisma.horseTrainingPlan.delete({
      where: { id: planId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting training plan:', error)
    return NextResponse.json(
      { error: 'Failed to delete training plan', message: error.message },
      { status: 500 }
    )
  }
}

