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
  
  console.log('🔍 Checking RESEND_API_KEY:', {
    raw: apiKeyRaw ? apiKeyRaw.substring(0, 15) + '...' : 'NOT SET',
    processed: apiKey ? apiKey.substring(0, 15) + '...' : 'NOT SET',
    length: apiKey?.length || 0,
  })
  
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set. Email sending is disabled.')
    return null
  }

  // Clear cache if API key changed (for hot reloading during development)
  if (cachedApiKey !== apiKey) {
    resend = null
    cachedApiKey = apiKey
    actualApiKeyUsed = apiKey // Store the actual key being used
    console.log('🔄 API key changed, clearing cache. New key:', apiKey.substring(0, 15) + '...')
  }

  if (!resend) {
    // Validate API key format (should start with 're_')
    if (!apiKey.startsWith('re_')) {
      console.error('❌ Invalid Resend API key format. API keys should start with "re_"')
      console.error('   Key received:', apiKey.substring(0, 20) + '...')
      return null
    }
    
    resend = new Resend(apiKey)
    actualApiKeyUsed = apiKey
    console.log('✅ Resend client initialized with API key:', apiKey.substring(0, 15) + '...')
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
      console.warn('⚠️ RESEND_FROM_EMAIL not set in environment, using params.from:', params.from)
    } else {
      console.log('✅ Using RESEND_FROM_EMAIL from environment:', envFromEmail)
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
      console.error('❌ Resend email error:', result.error)
      console.error('🔑 API Key actually used (first 15 chars):', actualApiKeyUsed?.substring(0, 15) + '...' || 'NOT SET')
      console.error('🔑 API Key from process.env (first 15 chars):', process.env.RESEND_API_KEY?.substring(0, 15) + '...' || 'NOT SET')
      console.error('📧 From email used:', fromEmail)
      console.error('📧 RESEND_FROM_EMAIL env var:', process.env.RESEND_FROM_EMAIL || 'NOT SET')
      console.error('📧 To email:', params.to)
      
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

    // Log successful email send
    console.log('✅ Email sent successfully:', {
      messageId: result.data?.id,
      to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
      from: fromEmail,
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

