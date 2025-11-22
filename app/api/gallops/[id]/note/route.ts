import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
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
      ownerId?: string
      trainerId?: string
    }

    const gallopId = params.id
    const formData = await request.formData()
    const note = formData.get('note') as string | null
    const photos = formData.getAll('photos') as File[]

    // Verify gallop exists and user has access
    const gallop = await prisma.horseGallop.findUnique({
      where: { id: gallopId },
      include: {
        horse: {
          include: {
            stablemate: true,
          },
        },
      },
    })

    if (!gallop) {
      return NextResponse.json(
        { error: 'Gallop not found' },
        { status: 404 }
      )
    }

    // Check access rights
    if (decoded.role === 'OWNER') {
      let ownerId = decoded.ownerId
      
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }
      
      if (!ownerId || gallop.horse.stablemate.ownerId !== ownerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role === 'TRAINER') {
      let trainerId = decoded.trainerId
      
      if (!trainerId) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
          where: { userId: decoded.id },
        })
        trainerId = trainerProfile?.id
      }
      
      if (!trainerId || gallop.horse.trainerId !== trainerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Process existing photos (those that weren't removed)
    const existingPhotos = formData.getAll('existingPhotos') as string[]
    const existingPhotoUrls: string[] = existingPhotos.filter(Boolean)

    // Process new photos
    let newPhotoUrls: string[] = []
    
    if (photos.length > 0) {
      for (const photo of photos) {
        if (photo.size > 0) {
          const bytes = await photo.arrayBuffer()
          const buffer = Buffer.from(bytes)
          const base64 = buffer.toString('base64')
          const dataUrl = `data:${photo.type};base64,${base64}`
          newPhotoUrls.push(dataUrl)
        }
      }
    }

    // Combine existing (not removed) and new photos
    const allPhotoUrls = [...existingPhotoUrls, ...newPhotoUrls]
    const photoUrlValue = allPhotoUrls.length > 0 
      ? (allPhotoUrls.length === 1 ? allPhotoUrls[0] : JSON.stringify(allPhotoUrls))
      : null

    // Update gallop
    const updatedGallop = await prisma.horseGallop.update({
      where: { id: gallopId },
      data: {
        note: note || null,
        photoUrl: photoUrlValue,
      },
    })

    return NextResponse.json({ success: true, gallop: updatedGallop })
  } catch (error) {
    console.error('Update gallop note error:', error)
    return NextResponse.json(
      { error: 'Failed to update gallop note' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
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
      ownerId?: string
      trainerId?: string
    }

    const gallopId = params.id

    // Verify gallop exists and user has access
    const gallop = await prisma.horseGallop.findUnique({
      where: { id: gallopId },
      include: {
        horse: {
          include: {
            stablemate: true,
          },
        },
      },
    })

    if (!gallop) {
      return NextResponse.json(
        { error: 'Gallop not found' },
        { status: 404 }
      )
    }

    // Check access rights
    if (decoded.role === 'OWNER') {
      let ownerId = decoded.ownerId
      
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }
      
      if (!ownerId || gallop.horse.stablemate.ownerId !== ownerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role === 'TRAINER') {
      let trainerId = decoded.trainerId
      
      if (!trainerId) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
          where: { userId: decoded.id },
        })
        trainerId = trainerProfile?.id
      }
      
      if (!trainerId || gallop.horse.trainerId !== trainerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete note and photoUrl
    await prisma.horseGallop.update({
      where: { id: gallopId },
      data: {
        note: null,
        photoUrl: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete gallop note error:', error)
    return NextResponse.json(
      { error: 'Failed to delete gallop note' },
      { status: 500 }
    )
  }
}

