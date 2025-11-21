import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      id: string
      role: string
    }

    if (decoded.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const owner = await prisma.ownerProfile.findUnique({
      where: { userId: decoded.id },
      include: {
        stablemate: true,
      },
    })

    if (!owner?.stablemate) {
      return NextResponse.json(
        { error: 'Stablemate not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { trainerEntryId } = body

    if (!trainerEntryId) {
      return NextResponse.json(
        { error: 'Trainer entry ID is required' },
        { status: 400 }
      )
    }

    // Verify the trainer entry belongs to this stablemate
    const trainerEntry = await prisma.stablemateTrainer.findFirst({
      where: {
        id: trainerEntryId,
        stablemateId: owner.stablemate.id,
      },
      select: { id: true, trainerProfileId: true },
    })

    if (!trainerEntry) {
      return NextResponse.json(
        { error: 'Geçersiz antrenör seçimi' },
        { status: 400 }
      )
    }

    if (!trainerEntry.trainerProfileId) {
      return NextResponse.json(
        { error: 'Bu antrenör henüz kayıt olmamış' },
        { status: 400 }
      )
    }

    // Get all horses in the stablemate
    const horses = await prisma.horse.findMany({
      where: {
        stablemateId: owner.stablemate.id,
      },
      select: { id: true },
    })

    if (horses.length === 0) {
      return NextResponse.json(
        { error: 'Ekürinizde at bulunmuyor' },
        { status: 400 }
      )
    }

    // Use a transaction to ensure all updates succeed or all fail
    await prisma.$transaction(
      horses.map((horse) =>
        prisma.horse.update({
          where: { id: horse.id },
          data: {
            trainerId: trainerEntry.trainerProfileId,
          },
        })
      )
    )

    return NextResponse.json({ 
      success: true,
      assignedCount: horses.length 
    })
  } catch (error: any) {
    console.error('[Stablemate Trainer Assign All][POST] error:', error)
    
    // Handle database connection errors
    if (error?.code === 'P1001') {
      return NextResponse.json(
        { error: 'Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.' },
        { status: 503 }
      )
    }
    
    // Handle Prisma errors
    if (error?.code?.startsWith('P')) {
      return NextResponse.json(
        { error: 'Veritabanı hatası oluştu. Lütfen daha sonra tekrar deneyin.' },
        { status: 500 }
      )
    }
    
    // Handle validation or other errors
    const errorMessage = error?.message || 'Antrenör ataması yapılırken bir hata oluştu'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

