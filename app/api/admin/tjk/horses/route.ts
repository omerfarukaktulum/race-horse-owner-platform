import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { searchTJKHorsesPlaywright } from '@/lib/tjk-api'
import { tjkApiRateLimiter, getClientIp } from '@/lib/rate-limit'

/**
 * Admin-only endpoint to fetch horses from TJK using Playwright
 * This is for admin onboarding - regular users use the database-only endpoint
 */
export async function GET(request: Request) {
  try {
    // Verify admin is logged in
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      role: string
    }

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const ownerRef = searchParams.get('ownerRef')
    const ownerName = searchParams.get('ownerName')

    console.log('[Admin TJK Horses API] Request:', { ownerName, ownerRef })

    if (!ownerName || !ownerRef) {
      return NextResponse.json(
        { error: 'Sahip adı ve TJK ID gereklidir' },
        { status: 400 }
      )
    }

    // Rate limiting
    const ip = getClientIp(request)
    const allowed = await tjkApiRateLimiter.check(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Çok fazla istek. Lütfen bir süre sonra tekrar deneyin.' },
        { status: 429 }
      )
    }

    // Use Playwright to fetch horses from TJK
    console.log('[Admin TJK Horses API] Fetching horses using Playwright for owner:', ownerRef)
    const horses = await searchTJKHorsesPlaywright(ownerName, ownerRef)

    console.log('[Admin TJK Horses API] Found', horses.length, 'horses from TJK')
    return NextResponse.json({ horses })
  } catch (error: any) {
    console.error('[Admin TJK Horses API] Error:', error)
    
    // Check if it's a browser unavailable error (Vercel/serverless)
    if (error.message?.includes('Executable doesn\'t exist') || error.message?.includes('browser')) {
      return NextResponse.json(
        { 
          error: 'BROWSER_UNAVAILABLE',
          message: 'Tarayıcı otomasyonu şu anda kullanılamıyor. Lütfen Playwright servisini yapılandırın veya atları manuel olarak ekleyin.'
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'At listesi alınırken bir hata oluştu' },
      { status: 500 }
    )
  }
}

