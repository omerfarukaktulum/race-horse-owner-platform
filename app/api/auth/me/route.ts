import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      email: string
      role: string
      ownerId?: string
      trainerId?: string
    }

    // Get fresh user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        ownerProfile: true,
        trainerProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      ownerId: user.ownerProfile?.id,
      trainerId: user.trainerProfile?.id,
      ownerProfile: user.ownerProfile ? {
        id: user.ownerProfile.id,
        officialName: user.ownerProfile.officialName,
        officialRef: user.ownerProfile.officialRef,
      } : null,
      trainerProfile: user.trainerProfile ? {
        id: user.trainerProfile.id,
        licenseNumber: user.trainerProfile.licenseNumber,
      } : null,
    }

    return NextResponse.json({ user: userData })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

