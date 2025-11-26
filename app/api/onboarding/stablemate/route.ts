import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { stablemateSchema } from '@/lib/validation/schemas'

export async function GET(request: Request) {
  try {
    // Get user from token
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

    // Get owner profile with stablemate
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        ownerProfile: {
          include: {
            stablemate: {
              include: {
                trainers: {
                  include: {
                    trainerProfile: {
                      include: {
                        user: true,
                      },
                    },
                  },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    if (!user?.ownerProfile) {
      return NextResponse.json(
        { error: 'Owner profile not found' },
        { status: 404 }
      )
    }

    if (!user.ownerProfile.stablemate) {
      return NextResponse.json(
        { error: 'Stablemate not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ stablemate: user.ownerProfile.stablemate })
  } catch (error) {
    console.error('Get stablemate error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stablemate' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Get user from token
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

    // Get owner profile
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { ownerProfile: true },
    })

    if (!user?.ownerProfile) {
      return NextResponse.json(
        { error: 'Owner profile not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validate stablemate input
    const validation = stablemateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const {
      name,
      foundationYear,
      coOwners,
      location,
      website,
      notifyHorseRegistered,
      notifyHorseDeclared,
      notifyNewTraining,
      notifyNewExpense,
      notifyNewNote,
      notifyNewRace,
    } = validation.data

    // Create stablemate for the logged-in user
    const stablemate = await prisma.stablemate.create({
      data: {
        ownerId: user.ownerProfile.id,
        name,
        foundationYear,
        coOwners: coOwners || [],
        location,
        website,
      },
    })

    return NextResponse.json({ 
      success: true, 
      stablemate,
    })
  } catch (error) {
    console.error('Create stablemate error:', error)
    return NextResponse.json(
      { error: 'Failed to create stablemate' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    // Get user from token
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

    // Get owner profile with stablemate
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

    if (!user?.ownerProfile) {
      return NextResponse.json(
        { error: 'Owner profile not found' },
        { status: 404 }
      )
    }

    if (!user.ownerProfile.stablemate) {
      return NextResponse.json(
        { error: 'Stablemate not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validate input
    const validation = stablemateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const {
      name,
      foundationYear,
      coOwners,
      location,
      website,
      notifyHorseRegistered,
      notifyHorseDeclared,
      notifyNewTraining,
      notifyNewExpense,
      notifyNewNote,
      notifyNewRace,
    } = validation.data

    // Update stablemate
    const stablemate = await prisma.stablemate.update({
      where: { id: user.ownerProfile.stablemate.id },
      data: {
        name,
        foundationYear,
        coOwners: coOwners || [],
        location,
        website,
        notifyHorseRegistered:
          typeof notifyHorseRegistered === 'boolean'
            ? notifyHorseRegistered
            : undefined,
        notifyHorseDeclared:
          typeof notifyHorseDeclared === 'boolean' ? notifyHorseDeclared : undefined,
        notifyNewTraining:
          typeof notifyNewTraining === 'boolean' ? notifyNewTraining : undefined,
        notifyNewExpense:
          typeof notifyNewExpense === 'boolean' ? notifyNewExpense : undefined,
        notifyNewNote:
          typeof notifyNewNote === 'boolean' ? notifyNewNote : undefined,
        notifyNewRace:
          typeof notifyNewRace === 'boolean' ? notifyNewRace : undefined,
      },
    })

    return NextResponse.json({ success: true, stablemate })
  } catch (error) {
    console.error('Update stablemate error:', error)
    return NextResponse.json(
      { error: 'Failed to update stablemate' },
      { status: 500 }
    )
  }
}

