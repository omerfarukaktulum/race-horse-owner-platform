import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { stablemateTrainerSchema } from '@/lib/validation/schemas'

async function getOwnerStablemate(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ownerProfile: {
        include: {
          stablemate: true,
        },
      },
    },
  })

  if (!user?.ownerProfile) {
    throw new Error('Owner profile not found')
  }

  if (!user.ownerProfile.stablemate) {
    throw new Error('Stablemate not found')
  }

  return user.ownerProfile.stablemate
}

function requireOwner(tokenValue?: string) {
  if (!tokenValue) {
    throw new Error('Unauthorized')
  }

  const decoded = verify(tokenValue, process.env.NEXTAUTH_SECRET!) as {
    id: string
    role: string
  }

  if (decoded.role !== 'OWNER') {
    throw new Error('Forbidden')
  }

  return decoded
}

export async function GET() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')
    const decoded = requireOwner(token?.value)
    const stablemate = await getOwnerStablemate(decoded.id)

    const trainers = await prisma.stablemateTrainer.findMany({
      where: { stablemateId: stablemate.id },
      include: {
        trainerProfile: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ trainers })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (error.message === 'Owner profile not found' || error.message === 'Stablemate not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }

    console.error('[Stablemate Trainers][GET] error:', error)
    return NextResponse.json({ error: 'Failed to fetch trainers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')
    const decoded = requireOwner(token?.value)
    const stablemate = await getOwnerStablemate(decoded.id)

    const body = await request.json()
    const validation = stablemateTrainerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { trainerName, trainerExternalId, trainerPhone, notes } = validation.data

    const existingTrainer = trainerExternalId
      ? await prisma.stablemateTrainer.findFirst({
          where: {
            stablemateId: stablemate.id,
            trainerExternalId,
          },
        })
      : null

    if (existingTrainer) {
      return NextResponse.json(
        { error: 'Bu antrenör zaten eklenmiş' },
        { status: 400 }
      )
    }

    const matchingProfile = trainerExternalId
      ? await prisma.trainerProfile.findFirst({
          where: {
            tjkTrainerId: trainerExternalId,
          },
        })
      : null

    const trainer = await prisma.stablemateTrainer.create({
      data: {
        stablemateId: stablemate.id,
        trainerName,
        trainerExternalId,
        trainerPhone,
        notes,
        trainerProfileId: matchingProfile?.id,
      },
      include: {
        trainerProfile: {
          include: {
            user: true,
          },
        },
      },
    })

    return NextResponse.json({ trainer })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (error.message === 'Owner profile not found' || error.message === 'Stablemate not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
    }

    console.error('[Stablemate Trainers][POST] error:', error)
    return NextResponse.json({ error: 'Failed to add trainer' }, { status: 500 })
  }
}

