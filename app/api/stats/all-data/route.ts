import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

/**
 * Get all race history and expenses for all horses
 * - For OWNER: horses in their stablemate
 * - For TRAINER: horses assigned to them
 * Used for the statistics page
 */
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

    if (!['OWNER', 'TRAINER'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let horseIds: string[] = []

    if (decoded.role === 'OWNER') {
      // Get owner profile and stablemate
      let ownerId = decoded.ownerId
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }

      if (!ownerId) {
        return NextResponse.json({ error: 'Owner profile not found' }, { status: 404 })
      }

      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { id: ownerId },
        select: {
          stablemate: {
            select: {
              id: true,
              horses: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      })

      if (!ownerProfile?.stablemate) {
        return NextResponse.json({ error: 'Stablemate not found' }, { status: 404 })
      }

      horseIds = ownerProfile.stablemate.horses.map((h: any) => h.id)
    } else if (decoded.role === 'TRAINER') {
      // Get trainer profile and assigned horses
      let trainerId = decoded.trainerId
      if (!trainerId) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
          where: { userId: decoded.id },
        })
        trainerId = trainerProfile?.id
      }

      if (!trainerId) {
        return NextResponse.json({ error: 'Trainer profile not found' }, { status: 404 })
      }

      const horses = await prisma.horse.findMany({
        where: {
          trainerId: trainerId,
        },
        select: {
          id: true,
        },
      })

      horseIds = horses.map((h) => h.id)
    }

    if (horseIds.length === 0) {
      return NextResponse.json({
        races: [],
        expenses: [],
      })
    }

    // Get all race history for all horses
    const raceHistory = await prisma.horseRaceHistory.findMany({
      where: {
        horseId: {
          in: horseIds,
        },
        // Only past races
        raceDate: {
          lt: new Date(),
        },
      },
      include: {
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        raceDate: 'desc',
      },
    })

    // Get all expenses for all horses
    const expenses = await prisma.expense.findMany({
      where: {
        horseId: {
          in: horseIds,
        },
      },
      include: {
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    // Format race history
    const formattedRaces = raceHistory.map((race) => ({
      id: race.id,
      raceDate: race.raceDate.toISOString(),
      city: race.city || undefined,
      distance: race.distance || undefined,
      surface: race.surface || undefined,
      jockeyName: race.jockeyName || undefined,
      prizeMoney: race.prizeMoney ? race.prizeMoney.toString() : undefined,
      raceType: race.raceType || undefined,
      position: race.position || undefined,
      horseId: race.horseId,
      horseName: race.horse?.name,
    }))

    // Format expenses
    const formattedExpenses = expenses.map((expense) => ({
      date: expense.date.toISOString().split('T')[0],
      amount: expense.amount.toString(),
      horseId: expense.horseId || undefined,
      horseName: expense.horse?.name,
      category: expense.category || undefined,
    }))

    return NextResponse.json({
      races: formattedRaces,
      expenses: formattedExpenses,
    })
  } catch (error) {
    console.error('[Stats All Data API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics data' },
      { status: 500 }
    )
  }
}

