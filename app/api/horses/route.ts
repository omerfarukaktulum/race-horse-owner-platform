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

    // Build query based on role
    let where: any = {}

    if (decoded.role === 'OWNER') {
      // Get owner profile - check by userId if ownerId not in token (for users who just completed onboarding)
      let ownerProfile
      
      if (decoded.ownerId) {
        ownerProfile = await prisma.ownerProfile.findUnique({
          where: { id: decoded.ownerId },
          include: { stablemate: true },
        })
      } else {
        // Token doesn't have ownerId yet, check by userId
        console.log('[Horses API] No ownerId in token, checking by userId')
        ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
          include: { stablemate: true },
        })
      }

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
        expenses: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log('[Horses API] Found', horses.length, 'horses')
    const horsesWithExternalRef = horses.filter(h => h.externalRef)
    console.log('[Horses API] Horses with externalRef:', horsesWithExternalRef.length, 'out of', horses.length)
    if (horsesWithExternalRef.length > 0) {
      console.log('[Horses API] Sample horses with externalRef:', horsesWithExternalRef.slice(0, 3).map(h => ({ name: h.name, externalRef: h.externalRef })))
    }

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

