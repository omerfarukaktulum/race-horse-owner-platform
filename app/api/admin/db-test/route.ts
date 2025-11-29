import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { getAdminDatabaseUrl } from '@/lib/admin-db-helper'
import { getAdminPrismaClient } from '@/lib/admin-prisma'

/**
 * Test endpoint to verify which database is actually being used
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

    // Get cookie preference
    const dbPreference = cookieStore.get('admin-db-preference')
    
    // Get the database URL that will be used
    const databaseUrl = getAdminDatabaseUrl()
    
    // Try to query the database to see what we get
    const prisma = getAdminPrismaClient()
    const userCount = await prisma.user.count()
    const firstUser = await prisma.user.findFirst({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // Check which database URL this is
    const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') || databaseUrl.includes('postgresql://postgres:postgres@')
    const isProd = databaseUrl.includes('supabase') || databaseUrl.includes('neon') || databaseUrl.includes('pooler.supabase.com')

    return NextResponse.json({
      cookiePreference: dbPreference?.value || 'not set',
      databaseUrl: {
        length: databaseUrl.length,
        preview: databaseUrl.substring(0, 50) + '...',
        isLocal,
        isProd,
        detectedType: isLocal ? 'LOCAL' : isProd ? 'PROD' : 'UNKNOWN',
      },
      databaseQuery: {
        userCount,
        firstUser: firstUser ? {
          email: firstUser.email,
          role: firstUser.role,
          createdAt: firstUser.createdAt,
        } : null,
      },
      environment: {
        hasDatabseUrl: !!process.env.DATABASE_URL,
        hasProdDatabseUrl: !!process.env.PROD_DATABASE_URL,
        databseUrlLength: process.env.DATABASE_URL?.length || 0,
        prodDatabseUrlLength: process.env.PROD_DATABASE_URL?.length || 0,
      },
    })
  } catch (error: any) {
    console.error('DB test error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test database',
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}

