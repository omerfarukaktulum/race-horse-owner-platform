import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/service'
import { registrationNotificationTemplate } from '@/lib/email/templates'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, nameSurname, telephone, role } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email ve rol gerekli' },
        { status: 400 }
      )
    }

    if (role !== 'OWNER' && role !== 'TRAINER') {
      return NextResponse.json(
        { error: 'Geçersiz rol' },
        { status: 400 }
      )
    }

    // Send registration notification email to admin
    const registrationEmailReceiver = process.env.REGISTRATION_EMAIL_RECEIVER
    console.log('[Registration Request] Checking email notification...')
    console.log('[Registration Request] REGISTRATION_EMAIL_RECEIVER:', registrationEmailReceiver ? 'SET' : 'NOT SET')
    console.log('[Registration Request] RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL ? 'SET' : 'NOT SET')
    console.log('[Registration Request] RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET')
    console.log('[Registration Request] Request data:', { email, nameSurname, telephone, role })
    
    if (registrationEmailReceiver) {
      try {
        console.log('[Registration Request] Attempting to send email to:', registrationEmailReceiver)
        
        // Generate a temporary ID for the request (not a user ID)
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
        
        const emailResult = await sendEmail({
          to: registrationEmailReceiver,
          from: process.env.RESEND_FROM_EMAIL || 'notifications@ekurim.com.tr',
          subject: role === 'OWNER' ? 'Yeni At Sahibi Kayıt Başvurusu' : 'Yeni Antrenör Kayıt Başvurusu',
          html: registrationNotificationTemplate({
            email,
            role: role as 'OWNER' | 'TRAINER',
            userId: requestId, // This is just a request ID, not a user ID
            registeredAt: new Date(),
            nameSurname,
            telephone,
          }),
        })
        console.log('[Registration Request] Email send result:', emailResult)
        if (emailResult.success) {
          console.log('[Registration Request] ✅ Email sent successfully, messageId:', emailResult.messageId)
        } else {
          console.error('[Registration Request] ❌ Email send failed:', emailResult.error)
        }
      } catch (emailError) {
        // Log error but don't fail the request
        console.error('[Registration Request] ❌ Exception while sending email:', emailError)
      }
    } else {
      console.warn('[Registration Request] ⚠️ REGISTRATION_EMAIL_RECEIVER not set, skipping email notification')
    }

    return NextResponse.json({
      success: true,
      message: 'Kayıt başvurunuz alınmıştır',
    })
  } catch (error) {
    console.error('Registration request error:', error)
    return NextResponse.json(
      { error: 'Başvuru sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}

