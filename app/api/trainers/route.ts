import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 3) {
      return NextResponse.json(
        { error: 'Query must be at least 3 characters' },
        { status: 400 }
      )
    }

    const trainers = await prisma.trainerProfile.findMany({
      where: {
        fullName: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      take: 10,
    })

    return NextResponse.json({ trainers })
  } catch (error) {
    console.error('Search trainers error:', error)
    return NextResponse.json(
      { error: 'Failed to search trainers' },
      { status: 500 }
    )
  }
}




