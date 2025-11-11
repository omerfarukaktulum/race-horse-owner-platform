import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { stablemateSchema } from '@/lib/validation/schemas'

export async function POST(request: Request) {
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
    }

    if (decoded.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get owner profile
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { ownerProfile: true },
    })

    if (!user?.ownerProfile) {
      return NextResponse.json(
        { error: 'Owner profile not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validate input
    const validation = stablemateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, foundationYear, coOwners, location, website } = validation.data

    // Create stablemate
    const stablemate = await prisma.stablemate.create({
      data: {
        ownerId: user.ownerProfile.id,
        name,
        foundationYear,
        coOwners: coOwners || [],
        location,
        website,
      },
    })

    return NextResponse.json({ success: true, stablemate })
  } catch (error) {
    console.error('Create stablemate error:', error)
    return NextResponse.json(
      { error: 'Failed to create stablemate' },
      { status: 500 }
    )
  }
}

