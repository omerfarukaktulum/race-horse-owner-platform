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

    const expenses = await prisma.expense.findMany({
      where: expenseFilter,
      include: {
        horse: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    // Generate CSV
    const headers = ['Tarih', 'At', 'Kategori', 'Tutar', 'Not']
    const rows = expenses.map((expense) => [
      new Date(expense.date).toLocaleDateString('tr-TR'),
      expense.horse.name,
      expense.category,
      expense.amount.toString(),
      expense.notes || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="giderler-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export expenses error:', error)
    return NextResponse.json(
      { error: 'Failed to export expenses' },
      { status: 500 }
    )
  }
}






