import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { authRateLimiter, getClientIp } from '@/lib/rate-limit'
import { registerOwnerSchema } from '@/lib/validation/schemas'
import { sendEmail } from '@/lib/email/service'
import { registrationNotificationTemplate } from '@/lib/email/templates'

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

    // Validate input
    const validation = registerOwnerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password } = validation.data

    // Check if user exists
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

    // Create user (owner profile will be created during onboarding)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'OWNER',
      },
    })

    // Send registration notification email to admin
    const registrationEmailReceiver = process.env.REGISTRATION_EMAIL_RECEIVER
    console.log('[Registration] Checking email notification...')
    console.log('[Registration] REGISTRATION_EMAIL_RECEIVER:', registrationEmailReceiver ? 'SET' : 'NOT SET')
    console.log('[Registration] RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL ? 'SET' : 'NOT SET')
    console.log('[Registration] RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET')
    
    if (registrationEmailReceiver) {
      try {
        console.log('[Registration] Attempting to send email to:', registrationEmailReceiver)
        const emailResult = await sendEmail({
          to: registrationEmailReceiver,
          from: process.env.RESEND_FROM_EMAIL || 'notifications@ekurim.com.tr',
          subject: 'Yeni At Sahibi Kayıt Başvurusu',
          html: registrationNotificationTemplate({
            email: user.email,
            role: 'OWNER',
            userId: user.id,
            registeredAt: new Date(),
          }),
        })
        console.log('[Registration] Email send result:', emailResult)
        if (emailResult.success) {
          console.log('[Registration] ✅ Email sent successfully, messageId:', emailResult.messageId)
        } else {
          console.error('[Registration] ❌ Email send failed:', emailResult.error)
        }
      } catch (emailError) {
        // Log error but don't fail registration
        console.error('[Registration] ❌ Exception while sending email:', emailError)
      }
    } else {
      console.warn('[Registration] ⚠️ REGISTRATION_EMAIL_RECEIVER not set, skipping email notification')
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Register owner error:', error)
    return NextResponse.json(
      { error: 'Kayıt sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}






