import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

const NOTIFICATION_FIELD_MAP = {
  horseRegistered: 'notifyHorseRegistered',
  horseDeclared: 'notifyHorseDeclared',
  newTraining: 'notifyNewTraining',
  newExpense: 'notifyNewExpense',
  newNote: 'notifyNewNote',
  newRace: 'notifyNewRace',
} as const

type NotificationKey = keyof typeof NOTIFICATION_FIELD_MAP

function serializeSettings(stablemate: any) {
  return {
    horseRegistered: stablemate.notifyHorseRegistered,
    horseDeclared: stablemate.notifyHorseDeclared,
    newTraining: stablemate.notifyNewTraining,
    newExpense: stablemate.notifyNewExpense,
    newNote: stablemate.notifyNewNote,
    newRace: stablemate.notifyNewRace,
  }
}

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

    if (decoded.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        ownerProfile: {
          include: {
            stablemate: true,
          },
        },
      },
    })

    if (!user?.ownerProfile?.stablemate) {
      return NextResponse.json({ error: 'Stablemate not found' }, { status: 404 })
    }

    return NextResponse.json({
      notificationSettings: serializeSettings(user.ownerProfile.stablemate),
    })
  } catch (error) {
    console.error('Get notification settings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 },
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

    if (decoded.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { key, value } = await request.json()

    if (!(key in NOTIFICATION_FIELD_MAP)) {
      return NextResponse.json({ error: 'Invalid notification key' }, { status: 400 })
    }

    if (typeof value !== 'boolean') {
      return NextResponse.json({ error: 'Invalid notification value' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        ownerProfile: {
          include: {
            stablemate: true,
          },
        },
      },
    })

    if (!user?.ownerProfile?.stablemate) {
      return NextResponse.json({ error: 'Stablemate not found' }, { status: 404 })
    }

    const fieldName = NOTIFICATION_FIELD_MAP[key as NotificationKey]

    const updated = await prisma.stablemate.update({
      where: { id: user.ownerProfile.stablemate.id },
      data: {
        [fieldName]: value,
      },
      select: {
        notifyHorseRegistered: true,
        notifyHorseDeclared: true,
        notifyNewTraining: true,
        notifyNewExpense: true,
        notifyNewNote: true,
        notifyNewRace: true,
      },
    })

    return NextResponse.json({
      success: true,
      notificationSettings: serializeSettings(updated),
    })
  } catch (error) {
    console.error('Update notification settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 },
    )
  }
}

