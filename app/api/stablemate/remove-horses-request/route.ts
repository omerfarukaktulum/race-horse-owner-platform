import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/service'
import { horseRemovalRequestTemplate } from '@/lib/email/templates'

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
      ownerId?: string
    }

    if (decoded.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { horseIds, horseNames } = body

    if (!Array.isArray(horseIds) || horseIds.length === 0) {
      return NextResponse.json(
        { error: 'En az bir at seçilmelidir' },
        { status: 400 }
      )
    }

    if (!Array.isArray(horseNames) || horseNames.length !== horseIds.length) {
      return NextResponse.json(
        { error: 'Geçersiz at bilgileri' },
        { status: 400 }
      )
    }

    // Get owner profile and stablemate
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: decoded.id },
      include: {
        stablemate: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    if (!ownerProfile || !ownerProfile.stablemate) {
      return NextResponse.json(
        { error: 'Eküri bulunamadı' },
        { status: 404 }
      )
    }

    // Verify that all horses belong to this stablemate
    const horses = await prisma.horse.findMany({
      where: {
        id: { in: horseIds },
        stablemateId: ownerProfile.stablemate.id,
      },
    })

    if (horses.length !== horseIds.length) {
      return NextResponse.json(
        { error: 'Bazı atlar ekürinize ait değil' },
        { status: 403 }
      )
    }

    // Send email to admin
    const adminEmail = process.env.REGISTRATION_EMAIL_RECEIVER
    
    if (adminEmail) {
      try {
        console.log('[Horse Removal Request] Attempting to send email to:', adminEmail)
        
        const emailResult = await sendEmail({
          to: adminEmail,
          from: process.env.RESEND_FROM_EMAIL || 'notifications@ekurim.com.tr',
          subject: 'At Çıkarma Başvurusu',
          html: horseRemovalRequestTemplate({
            ownerEmail: ownerProfile.user.email,
            stablemateName: ownerProfile.stablemate.name,
            horseNames,
            requestedAt: new Date(),
          }),
        })

        if (emailResult.success) {
          console.log('[Horse Removal Request] Email sent successfully:', emailResult.messageId)
        } else {
          console.error('[Horse Removal Request] Email send failed:', emailResult.error)
        }
      } catch (emailError) {
        console.error('[Horse Removal Request] Exception while sending email:', emailError)
        // Don't fail the request if email fails
      }
    } else {
      console.warn('[Horse Removal Request] ⚠️ REGISTRATION_EMAIL_RECEIVER not set, skipping email notification')
    }

    return NextResponse.json({
      success: true,
      message: 'Başvurunuz alındı',
    })
  } catch (error) {
    console.error('Horse removal request error:', error)
    return NextResponse.json(
      { error: 'Başvuru sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}

