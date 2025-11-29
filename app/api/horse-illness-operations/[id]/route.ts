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

async function getHorseIllnessOperation(operationId: string) {
  return prisma.horseIllnessOperation.findUnique({
    where: { id: operationId },
    include: {
      illness: {
        include: {
          horse: {
            include: {
              stablemate: true,
            },
          },
        },
      },
    },
  })
}

function canModifyOperation(decoded: DecodedToken, operation: any) {
  if (decoded.role === 'ADMIN') return true
  // Allow OWNER and TRAINER to modify any operation for their horses
  if (decoded.role === 'OWNER') {
    return operation.illness?.horse?.stablemate?.ownerId === decoded.ownerId
  }
  if (decoded.role === 'TRAINER') {
    return operation.illness?.horse?.trainerId === decoded.trainerId
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

    const operation = await getHorseIllnessOperation(params.id)

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      )
    }

    if (!canModifyOperation(decoded, operation)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.horseIllnessOperation.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete operation error:', error)
    return NextResponse.json(
      { error: 'Failed to delete operation' },
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

    const operation = await getHorseIllnessOperation(params.id)

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      )
    }

    if (!canModifyOperation(decoded, operation)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const updateData: any = {}

    const date = formData.get('date') as string | null
    if (date) {
      updateData.date = new Date(date)
    }

    const description = formData.get('description') as string | null
    if (description !== null) {
      updateData.description = description ? description.trim() : null
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

    const updatedOperation = await prisma.horseIllnessOperation.update({
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

    return NextResponse.json({ success: true, operation: updatedOperation })
  } catch (error) {
    console.error('Update operation error:', error)
    return NextResponse.json(
      { error: 'Failed to update operation' },
      { status: 500 }
    )
  }
}

