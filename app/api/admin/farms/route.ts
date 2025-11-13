import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function GET() {
  try {
    const farms = await prisma.farm.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ farms })
  } catch (error) {
    console.error('Fetch farms error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch farms' },
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

    const body = await request.json()
    const { name, location } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const farm = await prisma.farm.create({
      data: {
        name,
        location,
      },
    })

    return NextResponse.json({ farm })
  } catch (error) {
    console.error('Create farm error:', error)
    return NextResponse.json(
      { error: 'Failed to create farm' },
      { status: 500 }
    )
  }
}


