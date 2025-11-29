import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { tjkApiRateLimiter, getClientIp } from '@/lib/rate-limit'

/**
 * Get horses for a specific owner from database (USER SERVICE - NO PLAYWRIGHT)
 * Horses are pre-fetched during admin onboarding
 * This endpoint ONLY reads from database - no Playwright, no external service calls
 * For admin onboarding with Playwright, use /api/admin/tjk/horses
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerRef = searchParams.get('ownerRef')
    const ownerName = searchParams.get('ownerName')

    console.log('[TJK Horses API] Request:', { ownerName, ownerRef })

    if (!ownerName) {
      return NextResponse.json(
        { error: 'Sahip adı gereklidir' },
        { status: 400 }
      )
    }

    if (!ownerRef) {
      console.log('[TJK Horses API] No ownerRef provided, returning empty')
      return NextResponse.json({ horses: [] })
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

    // USER SERVICE: Only read from database (no Playwright, no external service)
    // Admin onboarding uses /api/admin/tjk/horses for Playwright fetching
    // Find owner profile by officialRef (TJK owner ID)
    const ownerProfile = await prisma.ownerProfile.findFirst({
      where: {
        officialRef: ownerRef,
      },
      include: {
        stablemate: {
          include: {
            horses: {
              where: {
                status: {
                  not: 'DEAD', // Exclude dead horses
                },
              },
              select: {
                id: true,
                name: true,
                yob: true,
                gender: true,
                status: true,
                externalRef: true,
                sireName: true,
                damName: true,
              },
              orderBy: {
                name: 'asc',
              },
            },
          },
        },
      },
    })

    if (!ownerProfile) {
      console.log('[TJK Horses API] No owner profile found for ownerRef:', ownerRef)
      return NextResponse.json({ horses: [] })
    }

    if (!ownerProfile.stablemate) {
      console.log('[TJK Horses API] Owner found but no stablemate - onboarding not completed')
      return NextResponse.json({ 
        horses: [],
        message: 'Eküri henüz oluşturulmamış. Lütfen önce eküri kurulumunu tamamlayın.'
      })
    }

    const horses = ownerProfile.stablemate.horses.map((horse) => ({
      name: horse.name,
      yob: horse.yob,
      gender: horse.gender,
      status: horse.status,
      externalRef: horse.externalRef,
      sire: horse.sireName,
      dam: horse.damName,
    }))

    console.log('[TJK Horses API] Found', horses.length, 'horses in database for owner:', ownerRef)
    
    // If no horses found, return empty (horses should be pre-loaded by admin)
    if (horses.length === 0) {
      console.log('[TJK Horses API] No horses found in database for owner:', ownerRef)
      return NextResponse.json({ 
        horses: [],
        message: 'Henüz hiç at eklenmemiş. Lütfen yöneticinizle iletişime geçin.'
      })
    }
    
    return NextResponse.json({ horses })
  } catch (error: any) {
    console.error('[TJK Horses API] Fatal error:', error)
    return NextResponse.json(
      { error: 'At listesi alınırken bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
