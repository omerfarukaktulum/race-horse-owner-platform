import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { sign } from 'jsonwebtoken'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, email, password } = body

    if (!code) {
      return NextResponse.json(
        { error: 'Admin kodu gerekli' },
        { status: 400 }
      )
    }

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

    const adminCode = process.env.ADMIN_CODE

    if (!adminCode) {
      return NextResponse.json(
        { error: 'Admin kodu yapılandırılmamış' },
        { status: 500 }
      )
    }

    if (code !== adminCode) {
      return NextResponse.json(
        { error: 'Geçersiz admin kodu' },
        { status: 401 }
      )
    }

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

    // Create owner account
    const adminUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'OWNER',
        // Don't create ownerProfile here - it will be created during onboarding
      },
    })

    // Create JWT token
    const token = sign(
      {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '90d' }
    )

    // Set cookie
    cookies().set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60, // 90 days
      path: '/',
    })

    return NextResponse.json({ 
      success: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      },
    })
  } catch (error) {
    console.error('Verify admin code error:', error)
    return NextResponse.json(
      { error: 'Hesap oluşturulamadı' },
      { status: 500 }
    )
  }
}

