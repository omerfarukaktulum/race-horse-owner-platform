import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { trainerAssignmentSchema } from '@/lib/validation/schemas'

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
    const validation = trainerAssignmentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const assignments = validation.data.assignments
    const horseIds = assignments.map((a) => a.horseId)
    const trainerEntryIds = assignments
      .map((a) => a.trainerEntryId)
      .filter((id): id is string => !!id)

    const horses = await prisma.horse.findMany({
      where: {
        id: { in: horseIds },
        stablemateId: owner.stablemate.id,
      },
      select: { id: true },
    })

    if (horses.length !== horseIds.length) {
      return NextResponse.json(
        { error: 'Bazı atlar ekürinize ait değil' },
        { status: 403 }
      )
    }

    const trainerEntries = trainerEntryIds.length
      ? await prisma.stablemateTrainer.findMany({
          where: {
            id: { in: trainerEntryIds },
            stablemateId: owner.stablemate.id,
          },
          select: { id: true, trainerProfileId: true },
        })
      : []

    const trainerMap = new Map(
      trainerEntries.map((entry) => [entry.id, entry])
    )

    for (const assignment of assignments) {
      if (!assignment.trainerEntryId) {
        await prisma.horse.update({
          where: { id: assignment.horseId },
          data: { trainerId: null },
        })
        continue
      }

      const entry = trainerMap.get(assignment.trainerEntryId)
      if (!entry) {
        return NextResponse.json(
          { error: 'Geçersiz antrenör seçimi' },
          { status: 400 }
        )
      }
      if (!entry.trainerProfileId) {
        return NextResponse.json(
          { error: 'Bu antrenör henüz kayıt olmamış' },
          { status: 400 }
        )
      }

      await prisma.horse.update({
        where: { id: assignment.horseId },
        data: { trainerId: entry.trainerProfileId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Stablemate Trainer Assign][POST] error:', error)
    return NextResponse.json(
      { error: 'Failed to assign trainers' },
      { status: 500 }
    )
  }
}

