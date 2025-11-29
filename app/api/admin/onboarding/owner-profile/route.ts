import { NextResponse } from 'next/server'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

/**
 * Admin onboarding: Create owner profile
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

    // Verify target user exists and is OWNER
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    if (targetUser.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Target user is not an OWNER' },
        { status: 400 }
      )
    }

    // Check if owner profile already exists
    const existingProfile = await prisma.ownerProfile.findUnique({
      where: { userId: targetUserId },
    })

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Owner profile already exists for this user' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { officialName, officialRef } = body

    if (!officialName) {
      return NextResponse.json(
        { error: 'Official name is required' },
        { status: 400 }
      )
    }

    // Create owner profile for target user
    const ownerProfile = await prisma.ownerProfile.create({
      data: {
        userId: targetUserId, // Bind to target user, not admin
        officialName: officialName.toUpperCase(),
        officialRef,
      },
    })

    return NextResponse.json({ success: true, ownerProfile })
  } catch (error) {
    console.error('Admin create owner profile error:', error)
    return NextResponse.json(
      { error: 'Failed to create owner profile' },
      { status: 500 }
    )
  }
}

