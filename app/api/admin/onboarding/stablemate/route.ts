import { NextResponse } from 'next/server'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { stablemateSchema } from '@/lib/validation/schemas'
import { verifyAdminAndGetTargetUserId } from '@/lib/admin-helper'

/**
 * Admin onboarding: Create stablemate
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

    // Get target user ID
    const { targetUserId } = await verifyAdminAndGetTargetUserId()
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user not set. Please start from create-user page.' },
        { status: 400 }
      )
    }

    // Use admin Prisma client (respects database switch preference)
    const prisma = getAdminPrismaClient()

    // Verify target user exists and is OWNER
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { ownerProfile: true },
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

    if (!targetUser.ownerProfile) {
      return NextResponse.json(
        { error: 'Owner profile not found for target user' },
        { status: 404 }
      )
    }

    // Check if stablemate already exists - handle migration not run yet
    let existingStablemate
    try {
      existingStablemate = await prisma.stablemate.findUnique({
        where: { ownerId: targetUser.ownerProfile.id },
      })
    } catch (error: any) {
      // If migration not run yet, fetch without the new fields
      if (error?.code === 'P2022' && error?.meta?.column?.includes('dataFetchStatus')) {
        existingStablemate = await prisma.stablemate.findUnique({
          where: { ownerId: targetUser.ownerProfile.id },
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
        })
      } else {
        throw error
      }
    }

    if (existingStablemate) {
      return NextResponse.json(
        { error: 'Stablemate already exists for this user' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate stablemate input
    const validation = stablemateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, foundationYear, coOwners, location, website } = validation.data

    // Create stablemate for target user - handle migration not run yet
    let stablemate
    try {
      stablemate = await prisma.stablemate.create({
        data: {
          ownerId: targetUser.ownerProfile.id, // Bind to target user, not admin
          name,
          foundationYear,
          coOwners: coOwners || [],
          location,
          website,
        },
      })
    } catch (error: any) {
      // If migration not run yet, the create will fail because Prisma tries to set default for dataFetchStatus
      // In this case, we need to run the migration first
      if (error?.code === 'P2022' && error?.meta?.column?.includes('dataFetchStatus')) {
        return NextResponse.json(
          { 
            error: 'Database migration required. Please run the migration to add dataFetchStatus fields to stablemates table.',
            migrationRequired: true 
          },
          { status: 500 }
        )
      } else {
        throw error
      }
    }

    return NextResponse.json({
      success: true,
      stablemate,
    })
  } catch (error) {
    console.error('Admin create stablemate error:', error)
    return NextResponse.json(
      { error: 'Failed to create stablemate' },
      { status: 500 }
    )
  }
}

