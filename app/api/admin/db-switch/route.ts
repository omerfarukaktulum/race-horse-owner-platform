import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { clearAdminPrismaCache } from '@/lib/admin-prisma'

/**
 * API endpoint to switch between local and production databases (admin only)
 */
export async function GET(request: Request) {
  try {
    // Admin authentication check
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as { role: string }
    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    // Get current preference
    const dbPreference = cookieStore.get('admin-db-preference')
    const currentPreference = dbPreference?.value || 'local'
    
    // Check if PROD_DATABASE_URL is available
    const hasProdDb = !!process.env.PROD_DATABASE_URL
    
    return NextResponse.json({
      current: currentPreference,
      available: {
        local: true,
        prod: hasProdDb,
      },
    })
  } catch (error: any) {
    console.error('Get DB switch status error:', error)
    return NextResponse.json(
      { error: 'Failed to get database switch status' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Admin authentication check
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as { role: string }
    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { preference } = body // 'local' or 'prod'

    if (preference !== 'local' && preference !== 'prod') {
      return NextResponse.json(
        { error: 'Invalid preference. Must be "local" or "prod"' },
        { status: 400 }
      )
    }

    // Check if PROD_DATABASE_URL is available when switching to prod
    if (preference === 'prod' && !process.env.PROD_DATABASE_URL) {
      return NextResponse.json(
        { error: 'PROD_DATABASE_URL is not configured' },
        { status: 400 }
      )
    }

    // Clear Prisma client cache to force new connections
    clearAdminPrismaCache()
    
    // Set cookie preference
    const response = NextResponse.json({ 
      success: true, 
      preference,
      message: `Switched to ${preference === 'prod' ? 'production' : 'local'} database`,
    })
    
    // Set cookie (expires in 7 days)
    // Note: Setting httpOnly to false temporarily for debugging - can be set back to true later
    response.cookies.set('admin-db-preference', preference, {
      httpOnly: false, // Allow client-side access for debugging
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    console.log(`[DB Switch] Switched to ${preference} database. Cookie set.`)
    console.log(`[DB Switch] PROD_DATABASE_URL exists: ${!!process.env.PROD_DATABASE_URL}`)
    console.log(`[DB Switch] DATABASE_URL exists: ${!!process.env.DATABASE_URL}`)

    return response
  } catch (error: any) {
    console.error('Switch database error:', error)
    return NextResponse.json(
      { error: 'Failed to switch database' },
      { status: 500 }
    )
  }
}

