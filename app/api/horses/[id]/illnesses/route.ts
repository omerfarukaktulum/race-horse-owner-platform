import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get user from token
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
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string | null
    const detail = formData.get('detail') as string | null
    const photos = formData.getAll('photos') as File[]

    if (!startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify horse exists and user has access
    const horse = await prisma.horse.findUnique({
      where: { id: horseId },
      include: { stablemate: true },
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
      
      if (!ownerId) {
        return NextResponse.json({ error: 'Owner profile not found' }, { status: 403 })
      }
      
      if (horse.stablemate.ownerId !== ownerId) {
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
      
      if (!trainerId) {
        return NextResponse.json({ error: 'Trainer profile not found' }, { status: 403 })
      }
      
      if (horse.trainerId !== trainerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Handle photo uploads (base64 for now, can be upgraded to Vercel Blob)
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

    // Create illness
    const horseIllness = await prisma.horseIllness.create({
      data: {
        horseId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        detail: detail ? detail.trim() : null,
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

    return NextResponse.json({ success: true, illness: horseIllness })
  } catch (error) {
    console.error('Create illness error:', error)
    return NextResponse.json(
      { error: 'Failed to create illness' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get user from token
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
      include: { stablemate: true },
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

    // Get illnesses with operations
    const illnesses = await prisma.horseIllness.findMany({
      where: { horseId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        detail: true,
        photoUrl: true,
        addedById: true,
        createdAt: true,
        updatedAt: true,
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
        operations: {
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
        },
      },
    })

    return NextResponse.json({ success: true, illnesses })
  } catch (error) {
    console.error('Get illnesses error:', error)
    return NextResponse.json(
      { error: 'Failed to get illnesses' },
      { status: 500 }
    )
  }
}

