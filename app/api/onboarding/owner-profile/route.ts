import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function POST(request: Request) {
  // BLOCKED: Regular onboarding is disabled - admin handles all setup
  return NextResponse.json(
    { error: 'Onboarding is disabled. Please contact your administrator.' },
    { status: 403 }
  )
}






