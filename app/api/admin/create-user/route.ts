import { NextResponse } from 'next/server'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

/**
 * Admin endpoint to create a user account
 * Only accessible by ADMIN role
 * Used when admin is setting up a new owner or trainer
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

    const body = await request.json()
    const { email, password, role } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email ve şifre gerekli' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Şifre en az 8 karakter olmalı' },
        { status: 400 }
      )
    }

    if (role !== 'OWNER' && role !== 'TRAINER' && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Geçersiz rol. Sadece OWNER, TRAINER veya ADMIN olabilir' },
        { status: 400 }
      )
    }

    // Use admin Prisma client (respects database switch preference)
    const prisma = getAdminPrismaClient()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi zaten kullanılıyor' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
      },
    })

    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Kullanıcı oluşturulamadı' },
      { status: 500 }
    )
  }
}

