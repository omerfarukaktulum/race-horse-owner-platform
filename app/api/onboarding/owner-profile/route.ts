import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

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

    const body = await request.json()
    const { officialName, officialRef } = body

    if (!officialName) {
      return NextResponse.json(
        { error: 'Official name is required' },
        { status: 400 }
      )
    }

    // Create owner profile
    const ownerProfile = await prisma.ownerProfile.create({
      data: {
        userId: decoded.id,
        officialName: officialName.toUpperCase(),
        officialRef,
      },
    })

    return NextResponse.json({ success: true, ownerProfile })
  } catch (error) {
    console.error('Create owner profile error:', error)
    return NextResponse.json(
      { error: 'Failed to create owner profile' },
      { status: 500 }
    )
  }
}






