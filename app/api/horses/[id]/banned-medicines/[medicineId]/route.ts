import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; medicineId: string } }
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

    const horseId = params.id
    const medicineId = params.medicineId
    const formData = await request.formData()
    const medicineName = formData.get('medicineName') as string | null
    const givenDate = formData.get('givenDate') as string | null
    const waitDaysStr = formData.get('waitDays') as string | null
    const note = formData.get('note') as string | null
    const photos = formData.getAll('photos') as File[]
    const existingPhotos = formData.getAll('existingPhotos') as string[]

    // Verify medicine exists and user has access
    const medicine = await prisma.horseBannedMedicine.findUnique({
      where: { id: medicineId },
      include: {
        horse: {
          include: {
            stablemate: true,
          },
        },
        addedBy: true,
      },
    })

    if (!medicine || medicine.horseId !== horseId) {
      return NextResponse.json(
        { error: 'Medicine record not found' },
        { status: 404 }
      )
    }

    // Check access rights - allow OWNER and TRAINER to edit any banned medicine for their horses
    if (decoded.role === 'OWNER') {
      let ownerId = decoded.ownerId
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }
      if (!ownerId || medicine.horse?.stablemate?.ownerId !== ownerId) {
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
      if (!trainerId || medicine.horse?.trainerId !== trainerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Process existing photos (those that weren't removed)
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

    // Update medicine record
    const updateData: any = {}
    if (medicineName) updateData.medicineName = medicineName
    if (givenDate) updateData.givenDate = new Date(givenDate)
    if (waitDaysStr) {
      const waitDays = parseInt(waitDaysStr, 10)
      if (!isNaN(waitDays) && waitDays >= 0) {
        updateData.waitDays = waitDays
      }
    }
    if (note !== null) updateData.note = note || null
    updateData.photoUrl = photoUrlValue

    const updatedMedicine = await prisma.horseBannedMedicine.update({
      where: { id: medicineId },
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

    return NextResponse.json({ success: true, medicine: updatedMedicine })
  } catch (error) {
    console.error('Update banned medicine error:', error)
    return NextResponse.json(
      { error: 'Failed to update banned medicine record' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; medicineId: string } }
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

    const horseId = params.id
    const medicineId = params.medicineId

    // Verify medicine exists and user has access
    const medicine = await prisma.horseBannedMedicine.findUnique({
      where: { id: medicineId },
      include: {
        horse: {
          include: {
            stablemate: true,
          },
        },
        addedBy: true,
      },
    })

    if (!medicine || medicine.horseId !== horseId) {
      return NextResponse.json(
        { error: 'Medicine record not found' },
        { status: 404 }
      )
    }

    // Check access rights - allow OWNER and TRAINER to delete any banned medicine for their horses
    if (decoded.role === 'OWNER') {
      let ownerId = decoded.ownerId
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }
      if (!ownerId || medicine.horse?.stablemate?.ownerId !== ownerId) {
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
      if (!trainerId || medicine.horse?.trainerId !== trainerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.horseBannedMedicine.delete({
      where: { id: medicineId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete banned medicine error:', error)
    return NextResponse.json(
      { error: 'Failed to delete banned medicine record' },
      { status: 500 }
    )
  }
}

