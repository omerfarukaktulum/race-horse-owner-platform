import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const racecourses = await prisma.racecourse.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ racecourses })
  } catch (error) {
    console.error('Get racecourses error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch racecourses' },
      { status: 500 }
    )
  }
}


