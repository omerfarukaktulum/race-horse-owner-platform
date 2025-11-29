import { NextResponse } from 'next/server'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { verifyAdminAndGetTargetUserId } from '@/lib/admin-helper'

/**
 * Admin onboarding: Get target user info
 * Returns target user's data for admin onboarding flow
 */
export async function GET() {
  try {
    // Verify admin is logged in
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      role: string
    }

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    // Get target user ID
    const { targetUserId } = await verifyAdminAndGetTargetUserId()
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user not set' },
        { status: 400 }
      )
    }

    // Use admin Prisma client (respects database switch preference)
    const prisma = getAdminPrismaClient()

    // Get target user with owner profile - handle migration not run yet
    let targetUser
    try {
      targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: {
          ownerProfile: {
            include: {
              stablemate: true,
            },
          },
        },
      })
    } catch (error: any) {
      // If migration not run yet, fetch without the new fields
      if (error?.code === 'P2022' && error?.meta?.column?.includes('dataFetchStatus')) {
        targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          include: {
            ownerProfile: {
              include: {
                stablemate: {
                  select: {
                    id: true,
                    name: true,
                    foundationYear: true,
                    location: true,
                    website: true,
                    createdAt: true,
                    updatedAt: true,
                    ownerId: true,
                    coOwners: true,
                    notifyHorseRegistered: true,
                    notifyHorseDeclared: true,
                    notifyNewTraining: true,
                    notifyNewExpense: true,
                    notifyNewNote: true,
                    notifyNewRace: true,
                  },
                },
              },
            },
          },
        })
      } else {
        throw error
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
      },
      ownerProfile: targetUser.ownerProfile,
    })
  } catch (error) {
    console.error('Get target user error:', error)
    return NextResponse.json(
      { error: 'Failed to get target user' },
      { status: 500 }
    )
  }
}

