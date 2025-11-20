import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: { trainerId: string } }
) {
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

    const trainerEntry = await prisma.stablemateTrainer.findUnique({
      where: { id: params.trainerId },
      include: {
        stablemate: true,
      },
    })

    if (!trainerEntry) {
      return NextResponse.json({ error: 'Antrenör bulunamadı' }, { status: 404 })
    }

    const owner = await prisma.ownerProfile.findUnique({
      where: { userId: decoded.id },
      select: { id: true },
    })

    if (!owner || trainerEntry.stablemate.ownerId !== owner.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (trainerEntry.trainerProfileId) {
      await prisma.horse.updateMany({
        where: {
          stablemateId: trainerEntry.stablemateId,
          trainerId: trainerEntry.trainerProfileId,
        },
        data: {
          trainerId: null,
        },
      })
    }

    await prisma.stablemateTrainer.delete({
      where: { id: params.trainerId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Stablemate Trainer][DELETE] error:', error)
    return NextResponse.json(
      { error: 'Failed to remove trainer' },
      { status: 500 }
    )
  }
}

