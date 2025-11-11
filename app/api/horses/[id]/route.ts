import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { horseSchema } from '@/lib/validation/schemas'

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

    const horse = await prisma.horse.findUnique({
      where: { id: params.id },
      include: {
        stablemate: {
          include: {
            owner: true,
          },
        },
        racecourse: true,
        farm: true,
        trainer: {
          include: {
            user: true,
          },
        },
        expenses: {
          include: {
            addedBy: {
              select: {
                email: true,
                role: true,
              },
            },
          },
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    })

    if (!horse) {
      return NextResponse.json({ error: 'Horse not found' }, { status: 404 })
    }

    // Check access
    const hasAccess =
      decoded.role === 'ADMIN' ||
      (decoded.role === 'OWNER' && horse.stablemate.ownerId === decoded.ownerId) ||
      (decoded.role === 'TRAINER' && horse.trainerId === decoded.trainerId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ horse })
  } catch (error) {
    console.error('Get horse error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch horse' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    }

    // Only owner and admin can update horses
    if (decoded.role !== 'OWNER' && decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check ownership
    const existingHorse = await prisma.horse.findUnique({
      where: { id: params.id },
      include: {
        stablemate: true,
      },
    })

    if (!existingHorse) {
      return NextResponse.json({ error: 'Horse not found' }, { status: 404 })
    }

    if (
      decoded.role === 'OWNER' &&
      existingHorse.stablemate.ownerId !== decoded.ownerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Partial validation
    const validation = horseSchema.partial().safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const horse = await prisma.horse.update({
      where: { id: params.id },
      data: validation.data,
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
    console.error('Update horse error:', error)
    return NextResponse.json(
      { error: 'Failed to update horse' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    }

    // Only owner and admin can delete horses
    if (decoded.role !== 'OWNER' && decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check ownership
    const horse = await prisma.horse.findUnique({
      where: { id: params.id },
      include: {
        stablemate: true,
      },
    })

    if (!horse) {
      return NextResponse.json({ error: 'Horse not found' }, { status: 404 })
    }

    if (
      decoded.role === 'OWNER' &&
      horse.stablemate.ownerId !== decoded.ownerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Soft delete by marking as RETIRED
    await prisma.horse.update({
      where: { id: params.id },
      data: { status: 'RETIRED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete horse error:', error)
    return NextResponse.json(
      { error: 'Failed to delete horse' },
      { status: 500 }
    )
  }
}

