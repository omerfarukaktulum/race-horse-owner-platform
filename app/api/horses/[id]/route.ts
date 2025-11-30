import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
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
          orderBy: { date: 'desc' },
          take: 200, // Increased from 10 to show more expenses
        },
        locationHistory: {
          include: {
            racecourse: true,
            farm: true,
          },
          orderBy: { startDate: 'desc' },
        },
        raceHistory: {
          orderBy: { raceDate: 'desc' },
          take: 50, // Latest 50 races
        },
        gallops: {
          select: {
            id: true,
            gallopDate: true,
            status: true,
            racecourse: true,
            surface: true,
            jockeyName: true,
            distances: true,
            note: true,
            photoUrl: true,
          },
          orderBy: { gallopDate: 'desc' },
          take: 100, // Latest 100 gallops
        },
        // Include notes, illnesses, and banned medicines in single query
        notes: {
          include: {
            addedBy: {
              select: {
                email: true,
                role: true,
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
          orderBy: { date: 'desc' },
          take: 200, // Limit notes to prevent loading too many
        },
        illnesses: {
          include: {
            operations: true,
            addedBy: {
              select: {
                email: true,
                role: true,
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
          orderBy: { startDate: 'desc' },
        },
        bannedMedicines: {
          include: {
            addedBy: {
              select: {
                email: true,
                role: true,
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
          orderBy: { givenDate: 'desc' },
        },
      },
    })

    if (!horse) {
      return NextResponse.json({ error: 'Horse not found' }, { status: 404 })
    }

    // Check access
    let hasAccess = false

    if (decoded.role === 'ADMIN') {
      hasAccess = true
    } else if (decoded.role === 'OWNER') {
      // Get ownerId - check by userId if not in token
      let ownerId = decoded.ownerId
      
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }
      
      hasAccess = ownerId ? horse.stablemate.ownerId === ownerId : false
    } else if (decoded.role === 'TRAINER') {
      // Get trainerId - check by userId if not in token
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

    if (decoded.role === 'OWNER') {
      // Get ownerId - check by userId if not in token
      let ownerId = decoded.ownerId
      
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }
      
      if (!ownerId || existingHorse.stablemate.ownerId !== ownerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
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

    // Use admin Prisma client for admins (respects database switch preference)
    // Use regular Prisma client for owners
    const dbClient = decoded.role === 'ADMIN' ? getAdminPrismaClient() : prisma

    // Check ownership
    const horse = await dbClient.horse.findUnique({
      where: { id: params.id },
      include: {
        stablemate: true,
      },
    })

    if (!horse) {
      return NextResponse.json({ error: 'Horse not found' }, { status: 404 })
    }

    if (decoded.role === 'OWNER') {
      // Get ownerId - check by userId if not in token
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
    }

    await dbClient.horse.delete({
      where: { id: params.id },
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

