import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

interface DecodedToken {
  id: string
  role: string
  ownerId?: string
  trainerId?: string
}

async function getOwnerId(userId: string) {
  const ownerProfile = await prisma.ownerProfile.findUnique({
    where: { userId },
  })
  return ownerProfile?.id
}

async function getTrainerId(userId: string) {
  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId },
  })
  return trainerProfile?.id
}

async function getAuthenticatedUser() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')

  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  try {
    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as DecodedToken

    if (decoded.role === 'OWNER') {
      if (!decoded.ownerId) {
        decoded.ownerId = await getOwnerId(decoded.id)
      }
      if (!decoded.ownerId) {
        return { error: NextResponse.json({ error: 'Owner profile not found' }, { status: 403 }) }
      }
    }

    if (decoded.role === 'TRAINER') {
      if (!decoded.trainerId) {
        decoded.trainerId = await getTrainerId(decoded.id)
      }
      if (!decoded.trainerId) {
        return { error: NextResponse.json({ error: 'Trainer profile not found' }, { status: 403 }) }
      }
    }

    return { decoded }
  } catch (error) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
}

async function getHorseIllness(illnessId: string) {
  return prisma.horseIllness.findUnique({
    where: { id: illnessId },
    include: {
      horse: {
        include: {
          stablemate: true,
        },
      },
    },
  })
}

function canModifyIllness(decoded: DecodedToken, illness: any) {
  if (decoded.role === 'ADMIN') return true
  // Allow OWNER and TRAINER to modify any illness for their horses
  if (decoded.role === 'OWNER') {
    return illness.horse?.stablemate?.ownerId === decoded.ownerId
  }
  if (decoded.role === 'TRAINER') {
    return illness.horse?.trainerId === decoded.trainerId
  }
  return false
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedUser()
    if ('error' in authResult) return authResult.error
    const { decoded } = authResult

    if (!['OWNER', 'TRAINER', 'ADMIN'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const illness = await getHorseIllness(params.id)

    if (!illness) {
      return NextResponse.json(
        { error: 'Illness not found' },
        { status: 404 }
      )
    }

    if (!canModifyIllness(decoded, illness)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.horseIllness.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete illness error:', error)
    return NextResponse.json(
      { error: 'Failed to delete illness' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedUser()
    if ('error' in authResult) return authResult.error
    const { decoded } = authResult

    if (!['OWNER', 'TRAINER', 'ADMIN'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const illness = await getHorseIllness(params.id)

    if (!illness) {
      return NextResponse.json(
        { error: 'Illness not found' },
        { status: 404 }
      )
    }

    if (!canModifyIllness(decoded, illness)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const updateData: any = {}

    const startDate = formData.get('startDate') as string | null
    if (startDate) {
      updateData.startDate = new Date(startDate)
    }

    const endDate = formData.get('endDate') as string | null
    if (endDate !== null) {
      updateData.endDate = endDate ? new Date(endDate) : null
    }

    const detail = formData.get('detail') as string | null
    if (detail !== null) {
      updateData.detail = detail ? detail.trim() : null
    }

    const photos = formData.getAll('photos') as File[]
    if (photos && photos.length > 0) {
      const photoUrls: string[] = []
      for (const photo of photos) {
        if (photo && photo.size > 0) {
          const bytes = await photo.arrayBuffer()
          const buffer = Buffer.from(bytes)
          const base64 = buffer.toString('base64')
          photoUrls.push(`data:${photo.type};base64,${base64}`)
        }
      }
      if (photoUrls.length > 0) {
        updateData.photoUrl = JSON.stringify(photoUrls)
      }
    }

    const updatedIllness = await prisma.horseIllness.update({
      where: { id: params.id },
      data: updateData,
      include: {
        addedBy: {
          select: {
            email: true,
            role: true,
            ownerProfile: {
              select: {
                officialName: true,
              },
            },
            trainerProfile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ success: true, illness: updatedIllness })
  } catch (error) {
    console.error('Update illness error:', error)
    return NextResponse.json(
      { error: 'Failed to update illness' },
      { status: 500 }
    )
  }
}

