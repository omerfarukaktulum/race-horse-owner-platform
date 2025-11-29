import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Try to get and verify the auth-token cookie
  let token: any = null
  const authToken = request.cookies.get('auth-token')
  
  if (authToken) {
    try {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
      const { payload } = await jwtVerify(authToken.value, secret)
      token = payload
    } catch (error) {
      // Invalid token, will be treated as not authenticated
      console.error('Token verification failed:', error)
    }
  }

  // Allow public routes (check these first, before any authentication checks)
  // Explicitly check for admin signin first
  if (pathname === '/admin-signin' || pathname.startsWith('/admin-signin/')) {
    return NextResponse.next()
  }

  if (
    pathname === '/' ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/admin/signin') ||
    pathname.startsWith('/api/admin-signin') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/screenshots') ||
    pathname.startsWith('/logo.png')
  ) {
    return NextResponse.next()
  }

  // Redirect to signin if not authenticated
  if (!token) {
    // If trying to access admin route, redirect to admin signin
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin-signin', request.url))
    }
    // Otherwise redirect to regular signin
    const signInUrl = new URL('/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }
  
  // Onboarding routes - BLOCKED for regular users (onboarding is done manually by admin only)
  // Only admin can access /admin/create-owner/* onboarding pages
  if (pathname.startsWith('/onboarding')) {
    // Redirect all users (including authenticated) away from regular onboarding
    // Admin onboarding is at /admin/create-owner/*
    return NextResponse.redirect(new URL('/app/home', request.url))
  }

  // Admin-only routes
  if (pathname.startsWith('/admin')) {
    if (token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/app/home', request.url))
    }
  }

  // Owner-only routes
  if (pathname.startsWith('/app/billing') || pathname.startsWith('/app/stablemate')) {
    if (token?.role !== 'OWNER' && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/app/home', request.url))
    }
  }

  // Add security headers
  const response = NextResponse.next()
  
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    )
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api/webhooks|_next/static|_next/image|favicon.ico|screenshots|logo.png).*)',
  ],
}

