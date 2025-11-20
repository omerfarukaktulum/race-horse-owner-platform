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

    if (decoded.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { fullName, tjkTrainerId } = body

    if (!fullName) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )
    }

    // Update trainer profile
    const trainerProfile = await prisma.trainerProfile.update({
      where: { userId: decoded.id },
      data: {
        fullName: fullName.toUpperCase(),
        tjkTrainerId: tjkTrainerId || null,
      },
    })

    // If tjkTrainerId is provided, link any existing stablemate trainers
    if (tjkTrainerId && trainerProfile) {
      await prisma.stablemateTrainer.updateMany({
        where: {
          trainerExternalId: tjkTrainerId,
        },
        data: {
          trainerProfileId: trainerProfile.id,
        },
      })
    }

    return NextResponse.json({ success: true, trainerProfile })
  } catch (error) {
    console.error('Update trainer profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update trainer profile' },
      { status: 500 }
    )
  }
}

