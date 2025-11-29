import { Resend } from 'resend'
import type { EmailResult } from './types'

/**
 * Resend email service client
 * Initialize only if API key is available
 */
let resend: Resend | null = null
let cachedApiKey: string | undefined = undefined
let actualApiKeyUsed: string | undefined = undefined // Store the actual key used

function getResendClient(): Resend | null {
  // Get API key and trim any whitespace/quotes
  const apiKeyRaw = process.env.RESEND_API_KEY
  const apiKey = apiKeyRaw?.trim().replace(/^["']|["']$/g, '') // Remove quotes if present
  
  // API key validation (no sensitive data logged)
  
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set. Email sending is disabled.')
    return null
  }

  // Clear cache if API key changed (for hot reloading during development)
  if (cachedApiKey !== apiKey) {
    resend = null
    cachedApiKey = apiKey
    actualApiKeyUsed = apiKey // Store the actual key being used
    // API key changed, clearing cache
  }

  if (!resend) {
    // Validate API key format (should start with 're_')
    if (!apiKey.startsWith('re_')) {
      console.error('[Email Service] Invalid Resend API key format. API keys should start with "re_"')
      return null
    }
    
    resend = new Resend(apiKey)
    actualApiKeyUsed = apiKey
    // Resend client initialized
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
    // Always prioritize RESEND_FROM_EMAIL from environment
    // Check for both undefined and empty string
    const envFromEmail = process.env.RESEND_FROM_EMAIL?.trim()
    const fromEmail = envFromEmail && envFromEmail.length > 0 ? envFromEmail : params.from

    if (!envFromEmail || envFromEmail.length === 0) {
      console.warn('[Email Service] RESEND_FROM_EMAIL not set in environment, using params.from')
    }

    // Format from email with display name "Ekürim"
    const fromEmailWithName = fromEmail.includes('<') 
      ? fromEmail 
      : `Ekürim <${fromEmail}>`

    const result = await client.emails.send({
      from: fromEmailWithName,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    })

    if (result.error) {
      console.error('[Email Service] Resend email error:', result.error)
      
      // Provide more helpful error messages
      const error = result.error as any
      let errorMessage = error.message || 'Failed to send email'
      if (error.statusCode === 401) {
        errorMessage = `Resend API key is invalid (401). Please verify:
1. The API key in .env matches the one in Resend dashboard
2. The API key is active (not revoked)
3. You've restarted your dev server after updating .env
4. The domain ${process.env.RESEND_FROM_EMAIL?.split('@')[1]} is verified in Resend`
      } else if (error.statusCode === 422) {
        errorMessage = 'Email validation failed. Please check the sender and recipient email addresses.'
      }
      
      return {
        success: false,
        error: errorMessage,
      }
    }

    // Log successful email send (no sensitive data)
    console.log('[Email Service] Email sent successfully:', {
      messageId: result.data?.id,
      subject: params.subject,
    })

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

