import { NextResponse } from 'next/server'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

/**
 * Admin onboarding: Create trainer profile
 * Binds to target user (from admin-target-user-id cookie), not admin
 */
export async function POST(request: Request) {
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

    // Get target user ID from cookie
    const targetUserIdCookie = cookieStore.get('admin-target-user-id')
    if (!targetUserIdCookie) {
      return NextResponse.json(
        { error: 'Target user not set. Please start from create-user page.' },
        { status: 400 }
      )
    }

    const targetUserId = targetUserIdCookie.value

    // Use admin Prisma client (respects database switch preference)
    const prisma = getAdminPrismaClient()

    // Verify target user exists and is TRAINER
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    if (targetUser.role !== 'TRAINER') {
      return NextResponse.json(
        { error: 'Target user is not a TRAINER' },
        { status: 400 }
      )
    }

    // Check if trainer profile already exists
    const existingProfile = await prisma.trainerProfile.findUnique({
      where: { userId: targetUserId },
    })

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Trainer profile already exists for this user' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { fullName, tjkTrainerId } = body

    if (!fullName) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )
    }

    // Create trainer profile for target user
    // Note: Trainer is not linked to any stablemate yet - owners will add them later
    const trainerProfile = await prisma.trainerProfile.create({
      data: {
        userId: targetUserId, // Bind to target user, not admin
        fullName: fullName.toUpperCase(),
        tjkTrainerId: tjkTrainerId || null,
        phone: null,
      },
    })

    return NextResponse.json({ success: true, trainerProfile })
  } catch (error) {
    console.error('Admin create trainer profile error:', error)
    return NextResponse.json(
      { error: 'Failed to create trainer profile' },
      { status: 500 }
    )
  }
}

