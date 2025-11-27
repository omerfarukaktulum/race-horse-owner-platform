import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const farms = await prisma.farm.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ farms })
  } catch (error) {
    console.error('Get farms error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch farms' },
      { status: 500 }
    )
  }
}






