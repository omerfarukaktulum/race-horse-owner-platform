import { Resend } from 'resend'
import type { EmailResult } from './types'

/**
 * Resend email service client
 * Initialize only if API key is available
 */
let resend: Resend | null = null

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Email sending is disabled.')
    return null
  }

  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }

  return resend
}

/**
 * Send an email using Resend
 */
export async function sendEmail(params: {
  to: string | string[]
  from: string
  subject: string
  html: string
  text?: string
}): Promise<EmailResult> {
  const client = getResendClient()

  if (!client) {
    return {
      success: false,
      error: 'Email service not configured',
    }
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || params.from

    const result = await client.emails.send({
      from: fromEmail,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    })

    if (result.error) {
      console.error('Resend email error:', result.error)
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      }
    }

    return {
      success: true,
      messageId: result.data?.id,
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL
}

