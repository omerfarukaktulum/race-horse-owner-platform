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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      role: string
      ownerId?: string
      trainerId?: string
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Build query based on role
    let where: any = {}

    if (decoded.role === 'OWNER' && decoded.ownerId) {
      // Owner sees their own horses
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { id: decoded.ownerId },
        include: { stablemate: true },
      })

      if (!ownerProfile?.stablemate) {
        return NextResponse.json({ horses: [] })
      }

      where.stablemateId = ownerProfile.stablemate.id
    } else if (decoded.role === 'TRAINER' && decoded.trainerId) {
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
        expenses: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ horses })
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

