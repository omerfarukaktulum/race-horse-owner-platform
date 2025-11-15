import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function GET() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      role: string
    }

    // Get owner profile
    let ownerId: string | undefined
    if (decoded.role === 'OWNER') {
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId: decoded.id },
      })
      ownerId = ownerProfile?.id
    }

    if (!ownerId) {
      return NextResponse.json({ error: 'Owner profile not found' }, { status: 404 })
    }

    // Get stablemate
    const stablemate = await prisma.stablemate.findFirst({
      where: { ownerId },
    })

    if (!stablemate) {
      return NextResponse.json({ error: 'Stablemate not found' }, { status: 404 })
    }

    // Get owner's externalRef for stable colors
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { id: ownerId },
      select: { officialRef: true },
    })

    // Get horses without current location (recently imported)
    const horses = await prisma.horse.findMany({
      where: {
        stablemateId: stablemate.id,
        // Horses without current location or very recently created
        OR: [
          {
            racecourseId: null,
            farmId: null,
          },
          {
            createdAt: {
              gte: new Date(Date.now() - 10 * 60 * 1000), // Created in last 10 minutes
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        yob: true,
        sireName: true,
        damName: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ 
      horses,
      ownerRef: ownerProfile?.officialRef || null,
    })
  } catch (error) {
    console.error('Get horses without location error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch horses' },
      { status: 500 }
    )
  }
}

