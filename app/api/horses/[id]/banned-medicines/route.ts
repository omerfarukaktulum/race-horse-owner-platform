import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function GET(
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

    const horseId = params.id

    // Verify horse exists and user has access
    const horse = await prisma.horse.findUnique({
      where: { id: horseId },
      include: {
        stablemate: true,
      },
    })

    if (!horse) {
      return NextResponse.json(
        { error: 'Horse not found' },
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
      
      if (!ownerId || horse.stablemate.ownerId !== ownerId) {
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
      
      if (!trainerId || horse.trainerId !== trainerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get banned medicines for this horse
    const medicines = await prisma.horseBannedMedicine.findMany({
      where: { horseId },
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
      orderBy: { givenDate: 'desc' },
    })

    return NextResponse.json({ success: true, medicines })
  } catch (error) {
    console.error('Get banned medicines error:', error)
    return NextResponse.json(
      { error: 'Failed to get banned medicines' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    const horseId = params.id
    const formData = await request.formData()
    const medicineName = formData.get('medicineName') as string
    const givenDate = formData.get('givenDate') as string
    const waitDaysStr = formData.get('waitDays') as string
    const note = formData.get('note') as string | null
    const photos = formData.getAll('photos') as File[]

    if (!medicineName || !givenDate || !waitDaysStr) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const waitDays = parseInt(waitDaysStr, 10)
    if (isNaN(waitDays) || waitDays < 0) {
      return NextResponse.json(
        { error: 'Invalid wait days' },
        { status: 400 }
      )
    }

    // Verify horse exists and user has access
    const horse = await prisma.horse.findUnique({
      where: { id: horseId },
      include: {
        stablemate: true,
      },
    })

    if (!horse) {
      return NextResponse.json(
        { error: 'Horse not found' },
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
      
      if (!ownerId || horse.stablemate.ownerId !== ownerId) {
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
      
      if (!trainerId || horse.trainerId !== trainerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Process photos
    let photoUrls: string[] = []
    
    if (photos.length > 0) {
      for (const photo of photos) {
        if (photo.size > 0) {
          const bytes = await photo.arrayBuffer()
          const buffer = Buffer.from(bytes)
          const base64 = buffer.toString('base64')
          const dataUrl = `data:${photo.type};base64,${base64}`
          photoUrls.push(dataUrl)
        }
      }
    }

    const photoUrlValue = photoUrls.length > 0 
      ? (photoUrls.length === 1 ? photoUrls[0] : JSON.stringify(photoUrls))
      : null

    // Create banned medicine record
    const medicine = await prisma.horseBannedMedicine.create({
      data: {
        horseId,
        medicineName,
        givenDate: new Date(givenDate),
        waitDays,
        note: note || null,
        photoUrl: photoUrlValue,
        addedById: decoded.id,
      },
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

    return NextResponse.json({ success: true, medicine })
  } catch (error) {
    console.error('Create banned medicine error:', error)
    return NextResponse.json(
      { error: 'Failed to create banned medicine record' },
      { status: 500 }
    )
  }
}

