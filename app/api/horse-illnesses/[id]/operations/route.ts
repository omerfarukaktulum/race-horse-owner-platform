import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

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

    const illnessId = params.id
    const formData = await request.formData()
    const date = formData.get('date') as string
    const description = formData.get('description') as string | null
    const photos = formData.getAll('photos') as File[]

    if (!date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify illness exists and user has access
    const illness = await prisma.horseIllness.findUnique({
      where: { id: illnessId },
      include: {
        horse: {
          include: { stablemate: true },
        },
      },
    })

    if (!illness) {
      return NextResponse.json(
        { error: 'Illness not found' },
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
      
      if (!ownerId || illness.horse?.stablemate?.ownerId !== ownerId) {
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
      
      if (!trainerId || illness.horse?.trainerId !== trainerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Handle photo uploads
    let photoUrls: string[] = []
    for (const photo of photos) {
      if (photo && photo.size > 0) {
        const bytes = await photo.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64 = buffer.toString('base64')
        photoUrls.push(`data:${photo.type};base64,${base64}`)
      }
    }
    const photoUrl = photoUrls.length > 0 ? JSON.stringify(photoUrls) : null

    // Create operation
    const operation = await prisma.horseIllnessOperation.create({
      data: {
        illnessId,
        date: new Date(date),
        description: description ? description.trim() : null,
        photoUrl,
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

    return NextResponse.json({ success: true, operation })
  } catch (error) {
    console.error('Create operation error:', error)
    return NextResponse.json(
      { error: 'Failed to create operation' },
      { status: 500 }
    )
  }
}

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

    const illnessId = params.id

    // Verify illness exists and user has access
    const illness = await prisma.horseIllness.findUnique({
      where: { id: illnessId },
      include: {
        horse: {
          include: { stablemate: true },
        },
      },
    })

    if (!illness) {
      return NextResponse.json(
        { error: 'Illness not found' },
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
      
      if (!ownerId || illness.horse?.stablemate?.ownerId !== ownerId) {
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
      
      if (!trainerId || illness.horse?.trainerId !== trainerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get operations
    const operations = await prisma.horseIllnessOperation.findMany({
      where: { illnessId },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        description: true,
        photoUrl: true,
        addedById: true,
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

    return NextResponse.json({ success: true, operations })
  } catch (error) {
    console.error('Get operations error:', error)
    return NextResponse.json(
      { error: 'Failed to get operations' },
      { status: 500 }
    )
  }
}

