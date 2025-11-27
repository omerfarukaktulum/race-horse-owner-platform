import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
      id: string
      role: string
      ownerId?: string
      trainerId?: string
    }

    // Build filter based on role
    const horseFilter: any = {}

    if (decoded.role === 'OWNER') {
      horseFilter.stablemate = {
        ownerId: decoded.ownerId,
      }
    } else if (decoded.role === 'TRAINER') {
      horseFilter.trainerId = decoded.trainerId
    }

    // Get horse counts by status
    const horses = await prisma.horse.findMany({
      where: horseFilter,
      include: {
        racecourse: true,
        farm: true,
        _count: {
          select: {
            expenses: true,
          },
        },
        expenses: {
          select: {
            amount: true,
            date: true,
          },
          where: {
            date: {
              gte: new Date(new Date().setDate(new Date().getDate() - 90)), // Last 90 days
            },
          },
        },
      },
    })

    // Count by status
    const statusCounts = horses.reduce((acc, horse) => {
      acc[horse.status] = (acc[horse.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Count by racecourse
    const racecourseCounts = horses.reduce((acc, horse) => {
      if (horse.racecourse) {
        acc[horse.racecourse.name] = (acc[horse.racecourse.name] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    // Top spending horses (last 90 days)
    const horsesWithSpend = horses
      .map((horse) => ({
        id: horse.id,
        name: horse.name,
        totalSpend: horse.expenses.reduce((sum, exp) => sum + exp.amount, 0),
        expenseCount: horse._count.expenses,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10)

    // Calculate average monthly spend per horse
    const totalSpend = horses.reduce(
      (sum, horse) =>
        sum + horse.expenses.reduce((s, exp) => s + exp.amount, 0),
      0
    )
    const avgMonthlySpendPerHorse = horses.length > 0 ? totalSpend / horses.length / 3 : 0 // 3 months

    return NextResponse.json({
      totalHorses: horses.length,
      statusCounts,
      racecourseCounts,
      topSpendingHorses: horsesWithSpend,
      avgMonthlySpendPerHorse,
    })
  } catch (error) {
    console.error('Fetch horse stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch horse stats' },
      { status: 500 }
    )
  }
}






