import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

const NOTE_CATEGORIES = ['Yem Takibi', 'Gezinti', 'Hastalık', 'Gelişim', 'Kilo Takibi'] as const
type NoteCategory = (typeof NOTE_CATEGORIES)[number]

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

async function getHorseNote(noteId: string) {
  return prisma.horseNote.findUnique({
    where: { id: noteId },
    include: {
      horse: {
        include: {
          stablemate: true,
        },
      },
    },
  })
}

function canModifyNote(decoded: DecodedToken, note: any) {
  if (decoded.role === 'ADMIN') return true
  // Only the creator can modify the note
  return note.addedById === decoded.id
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

    const note = await getHorseNote(params.id)

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    if (!canModifyNote(decoded, note)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.horseNote.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete note error:', error)
    return NextResponse.json(
      { error: 'Failed to delete note' },
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

    const note = await getHorseNote(params.id)

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    if (!canModifyNote(decoded, note)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const updateData: any = {}

    const date = formData.get('date') as string | null
    if (date) {
      updateData.date = new Date(date)
    }

    const noteText = formData.get('note') as string | null
    if (noteText !== null) {
      updateData.note = noteText.trim()
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

    const category = formData.get('category') as NoteCategory | null
    if (category !== null) {
      if (!NOTE_CATEGORIES.includes(category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }
      updateData.category = category
    }

    const kiloValueStr = formData.get('kiloValue') as string | null
    if (kiloValueStr !== null) {
      const kiloValue = kiloValueStr ? parseFloat(kiloValueStr) : null
      updateData.kiloValue = (category === 'Kilo Takibi' || category === 'Yem Takibi') ? kiloValue : null
    } else if (category !== null && category !== 'Kilo Takibi' && category !== 'Yem Takibi') {
      // If category is being changed away from kilo/yem categories, clear kiloValue
      updateData.kiloValue = null
    }

    const updatedNote = await prisma.horseNote.update({
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

    return NextResponse.json({ success: true, note: updatedNote })
  } catch (error) {
    console.error('Update note error:', error)
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    )
  }
}

