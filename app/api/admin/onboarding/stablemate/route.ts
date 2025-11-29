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
      // First try with all fields (if migration is run)
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
      // If migration not run yet, try creating without dataFetchStatus fields
      // We'll use raw SQL to insert only the fields that exist
      if (error?.code === 'P2022' && error?.meta?.column?.includes('dataFetchStatus')) {
        console.log('[Admin Stablemate] Migration not run yet, creating without dataFetchStatus fields')
        
        // Generate a CUID-like ID for the stablemate
        const generateId = () => {
          const timestamp = Date.now().toString(36)
          const randomPart = randomBytes(6).toString('hex')
          return `cl${timestamp}${randomPart}`
        }
        const stablemateId = generateId()
        
        // Use raw SQL to insert without the new fields
        // coOwners is a text array in PostgreSQL, format as array literal
        const coOwnersValue = coOwners && coOwners.length > 0 ? coOwners : []
        const coOwnersArrayLiteral = `{${coOwnersValue.map((o: string) => `"${String(o).replace(/"/g, '""')}"`).join(',')}}`
        
        await prisma.$executeRawUnsafe(
          `INSERT INTO stablemates (id, "ownerId", name, "foundationYear", "coOwners", location, website, "notifyHorseRegistered", "notifyHorseDeclared", "notifyNewTraining", "notifyNewExpense", "notifyNewNote", "notifyNewRace", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5::text[], $6, $7, true, true, true, true, true, true, NOW(), NOW())`,
          stablemateId,
          targetUser.ownerProfile.id,
          name,
          foundationYear || null,
          coOwnersArrayLiteral,
          location || null,
          website || null
        )
        
        // Fetch the created stablemate
        stablemate = await prisma.stablemate.findUnique({
          where: { ownerId: targetUser.ownerProfile.id },
          select: {
            id: true,
            ownerId: true,
            name: true,
            foundationYear: true,
            coOwners: true,
            location: true,
            website: true,
            createdAt: true,
            updatedAt: true,
            notifyHorseRegistered: true,
            notifyHorseDeclared: true,
            notifyNewTraining: true,
            notifyNewExpense: true,
            notifyNewNote: true,
            notifyNewRace: true,
          },
        })
        
        if (!stablemate) {
          throw new Error('Failed to create stablemate')
        }
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

