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
    const expenseFilter: any = {}

    if (decoded.role === 'OWNER') {
      expenseFilter.horse = {
        stablemate: {
          ownerId: decoded.ownerId,
        },
      }
    } else if (decoded.role === 'TRAINER') {
      expenseFilter.horse = {
        trainerId: decoded.trainerId,
      }
    }

    // Get expenses for the last 12 months
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const expenses = await prisma.expense.findMany({
      where: {
        ...expenseFilter,
        date: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        date: true,
        category: true,
        amount: true,
      },
    })

    // Group by month
    const monthlyTotals: Record<string, number> = {}
    const categoryByMonth: Record<string, Record<string, number>> = {}

    expenses.forEach((expense) => {
      const month = new Date(expense.date).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'short',
      })

      // Total by month
      monthlyTotals[month] = (monthlyTotals[month] || 0) + expense.amount

      // Category by month
      if (!categoryByMonth[month]) {
        categoryByMonth[month] = {}
      }
      categoryByMonth[month][expense.category] =
        (categoryByMonth[month][expense.category] || 0) + expense.amount
    })

    // Current year total
    const currentYear = new Date().getFullYear()
    const currentYearTotal = expenses
      .filter((exp) => new Date(exp.date).getFullYear() === currentYear)
      .reduce((sum, exp) => sum + exp.amount, 0)

    // Category totals
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)

    // Get horse count for average calculation
    const horseCount = await prisma.horse.count({
      where:
        decoded.role === 'OWNER'
          ? {
              stablemate: {
                ownerId: decoded.ownerId,
              },
            }
          : decoded.role === 'TRAINER'
          ? {
              trainerId: decoded.trainerId,
            }
          : {},
    })

    const avgPerHorse = horseCount > 0 ? currentYearTotal / horseCount : 0

    return NextResponse.json({
      monthlyTotals,
      categoryByMonth,
      currentYearTotal,
      categoryTotals,
      avgPerHorse,
      totalExpenses: expenses.length,
    })
  } catch (error) {
    console.error('Fetch expense stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expense stats' },
      { status: 500 }
    )
  }
}




