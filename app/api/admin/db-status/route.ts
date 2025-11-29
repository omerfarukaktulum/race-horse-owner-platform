import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { getDatabaseInfo, getAdminDatabaseUrl } from '@/lib/admin-db-helper'

/**
 * Get current database status (admin only)
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

    const dbInfo = getDatabaseInfo()
    const dbPreference = cookieStore.get('admin-db-preference')
    const currentPreference = dbPreference?.value || 'local'
    const hasProdDb = !!process.env.PROD_DATABASE_URL

    // Get the actual database URL being used (for debugging)
    const actualDbUrl = getAdminDatabaseUrl()
    const isProdUrl = actualDbUrl === process.env.PROD_DATABASE_URL
    const isLocalUrl = actualDbUrl === process.env.DATABASE_URL

    // Database status retrieved

    return NextResponse.json({
      type: dbInfo.type,
      name: dbInfo.name,
      projectRef: dbInfo.projectRef,
      url: dbInfo.url,
      currentPreference,
      hasProdDb,
      debug: {
        cookieValue: dbPreference?.value,
        cookieExists: !!dbPreference,
        isUsingProd: isProdUrl,
        isUsingLocal: isLocalUrl,
        actualUrlLength: actualDbUrl.length,
        databseUrlLength: process.env.DATABASE_URL?.length || 0,
        prodDatabaseUrlLength: process.env.PROD_DATABASE_URL?.length || 0,
      },
    })
  } catch (error: any) {
    console.error('Get DB status error:', error)
    return NextResponse.json(
      { error: 'Failed to get database status' },
      { status: 500 }
    )
  }
}

