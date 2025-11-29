import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { authRateLimiter, getClientIp } from '@/lib/rate-limit'
import { cookies } from 'next/headers'
import { sign } from 'jsonwebtoken'

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = getClientIp(request)
    const allowed = await authRateLimiter.check(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email, password, adminCode } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email ve şifre gerekli' },
        { status: 400 }
      )
    }

    if (!adminCode) {
      return NextResponse.json(
        { error: 'Admin kodu gerekli' },
        { status: 400 }
      )
    }

    // Verify admin code
    const requiredAdminCode = process.env.ADMIN_CODE
    if (!requiredAdminCode) {
      return NextResponse.json(
        { error: 'Admin kodu yapılandırılmamış' },
        { status: 500 }
      )
    }

    if (adminCode !== requiredAdminCode) {
      return NextResponse.json(
        { error: 'Geçersiz admin kodu' },
        { status: 401 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        ownerProfile: true,
        trainerProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      )
    }

    // Verify user is ADMIN
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Bu hesap admin değil' },
        { status: 403 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      )
    }

    // Create JWT token
    const token = sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        ownerId: user.ownerProfile?.id,
        trainerId: user.trainerProfile?.id,
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '90d' }
    )

    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      ownerId: user.ownerProfile?.id,
      trainerId: user.trainerProfile?.id,
    }

    // Create response and set cookie
    const response = NextResponse.json({
      success: true,
      user: userData,
    })

    // Set cookie in response headers
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60, // 90 days
      path: '/',
    })

    // Also set via cookies() for compatibility
    cookies().set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60, // 90 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Admin sign in error:', error)
    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    )
  }
}

