import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function POST(request: Request) {
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

    const formData = await request.formData()
    const date = formData.get('date') as string
    const category = formData.get('category') as string
    const amount = formData.get('amount') as string
    const note = formData.get('notes') as string  // Form sends 'notes' but DB expects 'note'
    const horseIdsJson = formData.get('horseIds') as string
    const photos = formData.getAll('photos') as File[]

    if (!date || !category || !amount || !horseIdsJson) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const horseIds = JSON.parse(horseIdsJson) as string[]

    if (!Array.isArray(horseIds) || horseIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one horse is required' },
        { status: 400 }
      )
    }

    // Verify horse ownership/assignment
    const horses = await prisma.horse.findMany({
      where: { id: { in: horseIds } },
      include: { stablemate: true },
    })

    if (horses.length !== horseIds.length) {
      return NextResponse.json(
        { error: 'Some horses not found' },
        { status: 404 }
      )
    }

    // Check access rights
    if (decoded.role === 'OWNER') {
      // Get ownerId - check by userId if not in token
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
      
      const hasAccess = horses.every((h) => h.stablemate.ownerId === ownerId)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (decoded.role === 'TRAINER') {
      // Get trainerId - check by userId if not in token
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
      
      const hasAccess = horses.every((h) => h.trainerId === trainerId)
      if (!hasAccess) {
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

    // Parse the date and combine with current time
    // The date comes as YYYY-MM-DD, we want to preserve the date but use current time
    const selectedDate = new Date(date)
    const now = new Date()
    
    // Combine selected date with current time
    const expenseDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    )

    // Create expense for each horse
    const expenses = await Promise.all(
      horseIds.map((horseId) =>
        prisma.expense.create({
          data: {
            horseId,
            date: expenseDate,
            category,
            amount: parseFloat(amount),
            note: note || null,  // DB field is 'note' not 'notes'
            photoUrl,
            addedById: decoded.id,
          },
          include: {
            horse: true,
        addedBy: {
          select: {
            email: true,
            role: true,
            ownerProfile: { select: { officialName: true } },
            trainerProfile: { select: { fullName: true } },
          },
        },
          },
        })
      )
    )

    return NextResponse.json({ success: true, expenses })
  } catch (error) {
    console.error('Create expense error:', error)
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const horseId = searchParams.get('horseId')
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build filter
    const where: any = {}

    if (horseId) {
      where.horseId = horseId
    }

    if (category) {
      where.category = category
    }

    if (startDate) {
      where.date = { ...where.date, gte: new Date(startDate) }
    }

    if (endDate) {
      where.date = { ...where.date, lte: new Date(endDate) }
    }

    // Filter by role
    if (decoded.role === 'OWNER') {
      // Get ownerId - check by userId if not in token
      let ownerId = decoded.ownerId
      
      if (!ownerId) {
        const ownerProfile = await prisma.ownerProfile.findUnique({
          where: { userId: decoded.id },
        })
        ownerId = ownerProfile?.id
      }
      
      if (ownerId) {
        where.horse = {
          stablemate: {
            ownerId: ownerId,
          },
        }
      }
    } else if (decoded.role === 'TRAINER') {
      // Get trainerId - check by userId if not in token
      let trainerId = decoded.trainerId
      
      if (!trainerId) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
          where: { userId: decoded.id },
        })
        trainerId = trainerProfile?.id
      }
      
      if (trainerId) {
        where.horse = {
          trainerId: trainerId,
        }
      }
    }

    // Fetch expenses
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        horse: true,
        addedBy: {
          select: {
            email: true,
            role: true,
            ownerProfile: { select: { officialName: true } },
            trainerProfile: { select: { fullName: true } },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json({ expenses })
  } catch (error) {
    console.error('Fetch expenses error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

