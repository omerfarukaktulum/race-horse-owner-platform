import { NextResponse } from 'next/server'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function GET(request: Request) {
  try {
    // Get user from token
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      role: string
    }

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    const where = role ? { role: role as any } : {}

    // Use admin Prisma client (respects database switch preference)
    console.log('[Admin Users API] Getting Prisma client...')
    const prisma = getAdminPrismaClient()
    console.log('[Admin Users API] Prisma client obtained, fetching users...')

    // Fetch users - exclude dataFetchStatus fields until migration is run
    // After migration, we can include stablemate: true to get all fields
    // Try to fetch with all fields first, fallback to excluding new fields if migration not run
    let users
    try {
      users = await prisma.user.findMany({
        where,
        include: {
          ownerProfile: {
            include: {
              stablemate: true,
            },
          },
          trainerProfile: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    } catch (error: any) {
      // If migration not run yet, fetch without the new fields
      if (error?.code === 'P2022' && error?.meta?.column?.includes('dataFetchStatus')) {
        console.log('Migration not run yet, fetching without dataFetchStatus fields')
        users = await prisma.user.findMany({
          where,
          include: {
            ownerProfile: {
              include: {
                stablemate: {
                  select: {
                    id: true,
                    name: true,
                    foundationYear: true,
                    location: true,
                    website: true,
                    createdAt: true,
                    updatedAt: true,
                    ownerId: true,
                    coOwners: true,
                    notifyHorseRegistered: true,
                    notifyHorseDeclared: true,
                    notifyNewTraining: true,
                    notifyNewExpense: true,
                    notifyNewNote: true,
                    notifyNewRace: true,
                  },
                },
              },
            },
            trainerProfile: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })
      } else {
        throw error
      }
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Fetch users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}






