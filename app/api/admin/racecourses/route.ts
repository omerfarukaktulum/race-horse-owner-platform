import { NextResponse } from 'next/server'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function GET() {
  try {
    // Use admin Prisma client (respects database switch preference)
    const prisma = getAdminPrismaClient()
    const racecourses = await prisma.racecourse.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ racecourses })
  } catch (error) {
    console.error('Fetch racecourses error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch racecourses' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Verify admin
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

    // Use admin Prisma client (respects database switch preference)
    const prisma = getAdminPrismaClient()

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const racecourse = await prisma.racecourse.create({
      data: {
        name,
      },
    })

    return NextResponse.json({ racecourse })
  } catch (error) {
    console.error('Create racecourse error:', error)
    return NextResponse.json(
      { error: 'Failed to create racecourse' },
      { status: 500 }
    )
  }
}






