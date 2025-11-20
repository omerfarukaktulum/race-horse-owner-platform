import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { trainerNotificationSchema } from '@/lib/validation/schemas'

export async function GET() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      role: string
    }

    if (decoded.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { userId: decoded.id },
      include: {
        horses: {
          include: {
            stablemate: true,
          },
        },
        stablemateLinks: {
          include: {
            stablemate: {
              include: {
                owner: {
                  include: {
                    user: {
                      select: { email: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!trainerProfile) {
      return NextResponse.json({ error: 'Trainer profile not found' }, { status: 404 })
    }

    const stablemateSummaries = trainerProfile.stablemateLinks.map((link) => {
      const horses = trainerProfile.horses.filter((horse) => horse.stablemateId === link.stablemateId)

      return {
        id: link.stablemateId,
        name: link.stablemate.name,
        location: link.stablemate.location,
        ownerName: link.stablemate.owner.officialName,
        ownerEmail: link.stablemate.owner.user?.email ?? null,
        totalHorses: horses.length,
        horses: horses.map((horse) => ({
          id: horse.id,
          name: horse.name,
          status: horse.status,
        })),
      }
    })

    return NextResponse.json({
      trainer: {
        id: trainerProfile.id,
        fullName: trainerProfile.fullName,
        phone: trainerProfile.phone,
        tjkTrainerId: trainerProfile.tjkTrainerId,
        notifyHorseRegistered: trainerProfile.notifyHorseRegistered,
        notifyHorseDeclared: trainerProfile.notifyHorseDeclared,
        notifyNewTraining: trainerProfile.notifyNewTraining,
        notifyNewExpense: trainerProfile.notifyNewExpense,
        notifyNewNote: trainerProfile.notifyNewNote,
        notifyNewRace: trainerProfile.notifyNewRace,
      },
      stablemates: stablemateSummaries,
    })
  } catch (error) {
    console.error('[Trainer Account][GET] error:', error)
    return NextResponse.json(
      { error: 'Failed to load trainer overview' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      role: string
    }

    if (decoded.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = trainerNotificationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { userId: decoded.id },
      select: { id: true },
    })

    if (!trainerProfile) {
      return NextResponse.json({ error: 'Trainer profile not found' }, { status: 404 })
    }

    const updated = await prisma.trainerProfile.update({
      where: { id: trainerProfile.id },
      data: validation.data,
      select: {
        notifyHorseRegistered: true,
        notifyHorseDeclared: true,
        notifyNewTraining: true,
        notifyNewExpense: true,
        notifyNewNote: true,
        notifyNewRace: true,
      },
    })

    return NextResponse.json({ success: true, notifications: updated })
  } catch (error) {
    console.error('[Trainer Account][PATCH] error:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}

