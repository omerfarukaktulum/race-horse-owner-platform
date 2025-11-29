import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
import { verifyAdminAndGetTargetUserId } from '@/lib/admin-helper'

/**
 * Admin endpoint to get horses for the target user
 * Uses admin Prisma client (respects database switch preference)
 */
export async function GET(request: Request) {
  try {
    // Verify admin is logged in
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      role: string
    }

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin only' },
        { status: 403 }
      )
    }

    // Get target user ID (for admin onboarding)
    const { targetUserId } = await verifyAdminAndGetTargetUserId()
    
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user not set. Please start from create-user page.' },
        { status: 400 }
      )
    }

    // Use admin Prisma client (respects database switch preference)
    const prisma = getAdminPrismaClient()

    // Get target user with stablemate and horses
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        ownerProfile: {
          include: {
            stablemate: {
              include: {
                horses: {
                  select: {
                    id: true,
                    name: true,
                    yob: true,
                    gender: true,
                    status: true,
                    externalRef: true,
                    sireName: true,
                    damName: true,
                  },
                  orderBy: {
                    name: 'asc',
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user?.ownerProfile?.stablemate) {
      return NextResponse.json({ horses: [] })
    }

    const horses = user.ownerProfile.stablemate.horses.map((horse) => ({
      id: horse.id,
      name: horse.name,
      yob: horse.yob,
      gender: horse.gender,
      status: horse.status,
      externalRef: horse.externalRef,
      sire: horse.sireName,
      dam: horse.damName,
    }))

    return NextResponse.json({ horses })
  } catch (error: any) {
    console.error('[Admin Horses API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch horses', message: error.message },
      { status: 500 }
    )
  }
}

