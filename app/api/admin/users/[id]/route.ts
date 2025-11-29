import { NextResponse } from 'next/server'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

/**
 * PATCH /api/admin/users/[id]
 * Update user email
 * Only accessible by ADMIN role
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'E-posta adresi gerekli' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta formatı' },
        { status: 400 }
      )
    }

    // Use admin Prisma client (respects database switch preference)
    const prisma = getAdminPrismaClient()

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    // Check if new email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi zaten kullanılıyor' },
        { status: 400 }
      )
    }

    // Update user email
    await prisma.user.update({
      where: { id: userId },
      data: { email },
    })

    return NextResponse.json({
      success: true,
      message: 'E-posta adresi başarıyla güncellendi',
    })
  } catch (error: any) {
    console.error('Update user email error:', error)
    return NextResponse.json(
      { error: 'E-posta adresi güncellenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user and all associated data
 * Only accessible by ADMIN role
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id

    // Prevent admin from deleting themselves
    if (decoded.id === userId) {
      return NextResponse.json(
        { error: 'Kendi hesabınızı silemezsiniz' },
        { status: 400 }
      )
    }

    // Use admin Prisma client (respects database switch preference)
    const prisma = getAdminPrismaClient()

    // Check if user exists - handle migration not run yet
    let user
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          ownerProfile: {
            include: {
              stablemate: {
                include: {
                  horses: true,
                },
              },
            },
          },
          trainerProfile: true,
        },
      })
    } catch (error: any) {
      // If migration not run yet, fetch without the new fields
      if (error?.code === 'P2022' && error?.meta?.column?.includes('dataFetchStatus')) {
        user = await prisma.user.findUnique({
          where: { id: userId },
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
                    horses: true,
                  },
                },
              },
            },
            trainerProfile: true,
          },
        })
      } else {
        throw error
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    // Delete user and all associated data
    // Prisma will handle cascading deletes based on schema relationships
    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi',
    })
  } catch (error: any) {
    console.error('Delete user error:', error)
    
    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Bu kullanıcıya bağlı veriler olduğu için silinemiyor' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Kullanıcı silinirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

