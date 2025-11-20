import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

/**
 * Get recent expenses for all horses in the user's stablemate
 * Query params: limit (default 10)
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    let horses: Array<{ id: string; name: string }> = []

    if (decoded.role === 'OWNER') {
      let ownerId = decoded.ownerId
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }

      if (ownerId) {
        const stablemate = await prisma.stablemate.findUnique({
          where: { ownerId },
          select: { id: true },
        })
        if (stablemate?.id) {
          horses = await prisma.horse.findMany({
            where: { stablemateId: stablemate.id },
            select: { id: true, name: true },
          })
        }
      }
    } else if (decoded.role === 'TRAINER') {
      let trainerId = decoded.trainerId
      if (!trainerId) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
          where: { userId: decoded.id },
          select: { id: true },
        })
        trainerId = trainerProfile?.id
      }

      if (trainerId) {
        horses = await prisma.horse.findMany({
          where: { trainerId },
          select: { id: true, name: true },
        })
      }
    } else {
      return NextResponse.json({ expenses: [] })
    }

    if (!horses.length) {
      return NextResponse.json({ expenses: [] })
    }

    const horseIds = horses.map(h => h.id)
    const horseMap = new Map(horses.map(h => [h.id, h.name]))

    // Get recent expenses ordered by createdAt
    const recentExpenses = await prisma.expense.findMany({
      where: {
        horseId: {
          in: horseIds,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        addedBy: {
          select: {
            email: true,
          },
        },
      },
    })

    // Map expenses with horse names
    const expensesWithHorses = recentExpenses.map((expense) => ({
      id: expense.id,
      horseId: expense.horseId,
      horseName: horseMap.get(expense.horseId) || 'Unknown',
      date: expense.date.toISOString(),
      category: expense.category,
      customName: expense.customName,
      amount: expense.amount.toString(),
      currency: expense.currency,
      note: expense.note,
      addedBy: expense.addedBy.email,
      createdAt: expense.createdAt.toISOString(),
    }))

    return NextResponse.json({ expenses: expensesWithHorses })
  } catch (error) {
    console.error('[Recent Expenses API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent expenses' },
      { status: 500 }
    )
  }
}

