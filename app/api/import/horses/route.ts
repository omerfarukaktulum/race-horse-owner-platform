import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { fetchTJKHorseDetail } from '@/lib/tjk-horse-detail-scraper'
import { verifyAdminAndGetTargetUserId } from '@/lib/admin-helper'

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

    // Check if admin mode (admin creating account for target user)
    const { isAdmin, targetUserId } = await verifyAdminAndGetTargetUserId()
    
    // Determine which user ID to use
    const effectiveUserId = isAdmin && targetUserId ? targetUserId : decoded.id

    // Verify role (admin can import for OWNER, or user must be OWNER)
    if (!isAdmin && decoded.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get stablemate for effective user
    const user = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      include: {
        ownerProfile: {
          include: {
            stablemate: true,
          },
        },
      },
    })

    if (!user?.ownerProfile?.stablemate) {
      return NextResponse.json(
        { error: 'Stablemate not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { horses } = body

    if (!Array.isArray(horses) || horses.length === 0) {
      return NextResponse.json(
        { error: 'Horses array is required' },
        { status: 400 }
      )
    }

    // Create horses
    console.log('[Import Horses API] Received', horses.length, 'horses to import')
    horses.forEach((horse: any, index: number) => {
      console.log(`[Import Horses API] Horse ${index + 1}:`, {
        name: horse.name,
        externalRef: horse.externalRef,
        hasExternalRef: !!horse.externalRef,
      })
    })

    const createdHorses = await Promise.all(
      horses.map((horse: any) => {
        console.log('[Import Horses API] Creating horse:', horse.name, 'with externalRef:', horse.externalRef)
        return prisma.horse.create({
          data: {
            stablemateId: user.ownerProfile!.stablemate!.id,
            name: horse.name,
            yob: horse.yob,
            status: horse.status || 'RACING',
            gender: horse.gender,
            racecourseId: horse.racecourseId,
            farmId: horse.farmId,
            trainerId: horse.trainerId,
            groomName: horse.groomName,
            stableLabel: horse.stableLabel,
            externalRef: horse.externalRef || null,
            // Save pedigree data from TJK initial import
            sireName: horse.sire ? horse.sire.trim() : null,
            damName: horse.dam ? horse.dam.trim() : null,
          },
        })
      })
    )

    console.log('[Import Horses API] Created', createdHorses.length, 'horses')
    createdHorses.forEach((horse, index) => {
      console.log(`[Import Horses API] Created horse ${index + 1}:`, {
        id: horse.id,
        name: horse.name,
        externalRef: horse.externalRef,
      })
    })

    // Return immediately - detailed data fetching will happen in background
    // The frontend will poll for status or use a separate endpoint
    return NextResponse.json({
      success: true,
      horses: createdHorses,
      message: 'Horses created. Fetching detailed data in background...',
    })
  } catch (error) {
    console.error('Import horses error:', error)
    return NextResponse.json(
      { error: 'Failed to import horses' },
      { status: 500 }
    )
  }
}

