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
    const horseIdsJson = formData.get('horseIds') as string | null
    const photos = formData.getAll('photos') as File[]

    if (!date || !category || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const horseIds = horseIdsJson ? (JSON.parse(horseIdsJson) as string[]).filter(Boolean) : []

    // Categories that require horse selection
    const HORSE_REQUIRED_CATEGORIES = ['ILAC', 'MONT', 'NAKLIYE']
    const requiresHorse = HORSE_REQUIRED_CATEGORIES.includes(category)

    if (requiresHorse && (!Array.isArray(horseIds) || horseIds.length === 0)) {
      return NextResponse.json(
        { error: 'At least one horse is required for this category' },
        { status: 400 }
      )
    }

    // Verify horse ownership/assignment if horses are provided
    if (horseIds.length > 0) {
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
      
        const hasAccess = horses.every((h) => h.stablemate?.ownerId === ownerId)
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

    // Create expense(s)
    // If horseIds are provided, create one expense per horse
    // Otherwise, create a single expense without a horse
    if (horseIds.length > 0) {
    const expenses = await Promise.all(
      horseIds.map((horseId) =>
        prisma.expense.create({
          data: {
            horseId,
            date: expenseDate,
              category: category as any,
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
    } else {
      // Create expense without horse
      const expense = await prisma.expense.create({
        data: {
          horseId: null as any,
          date: expenseDate,
          category: category as any,
          amount: parseFloat(amount),
          note: note || null,
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
      return NextResponse.json({ success: true, expenses: [expense] })
    }
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
    const limitParam = searchParams.get('limit')
    // For trainers, use a higher limit or no limit since they need to see expenses from all stablemates
    // For owners, use the default limit
    const defaultLimit = decoded.role === 'TRAINER' ? 10000 : 1000
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 0, 1), defaultLimit) : defaultLimit

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
        // Trainers should see expenses for:
        // 1. Horses assigned to them (horse.trainerId = trainerId)
        // 2. Expenses they added themselves (addedById = userId)
        // Prisma will AND the OR condition with other top-level filters
        where.OR = [
          {
            horse: {
              trainerId: trainerId,
            },
          },
          {
            addedById: decoded.id,
          },
        ]
      }
    }

    // Fetch expenses
    const expenses = await prisma.expense.findMany({
      where,
      select: {
        id: true,
        date: true,
        createdAt: true,
        category: true,
        customName: true,
        amount: true,
        currency: true,
        note: true,
        photoUrl: true,
        addedById: true,
        horse: {
          select: {
            id: true,
            name: true,
            ...(decoded.role === 'TRAINER' ? {
              stablemate: {
                select: {
                  id: true,
                  name: true,
                },
              },
            } : {}),
          },
        },
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
      ...(decoded.role === 'TRAINER' ? {} : { take: limit }), // No limit for trainers, they need all expenses
    })

    // For trainers, also fetch distinct stablemates they have access to
    let stablemates: string[] = []
    if (decoded.role === 'TRAINER') {
      let trainerId = decoded.trainerId
      
      if (!trainerId) {
        const trainerProfile = await prisma.trainerProfile.findUnique({
          where: { userId: decoded.id },
        })
        trainerId = trainerProfile?.id
      }
      
      if (trainerId) {
        // Get distinct stablemates from:
        // 1. Horses assigned to trainer
        const assignedHorses = await prisma.horse.findMany({
          where: { trainerId },
          select: {
            stablemate: {
              select: {
                name: true,
              },
            },
          },
        })
        
        // 2. Expenses added by trainer
        const trainerExpenses = await prisma.expense.findMany({
          where: { addedById: decoded.id },
          select: {
            horse: {
              select: {
                stablemate: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        })
        
        // Combine and get unique stablemate names
        const stablemateSet = new Set<string>()
        assignedHorses.forEach((horse) => {
          if (horse.stablemate?.name) {
            stablemateSet.add(horse.stablemate.name)
          }
        })
        trainerExpenses.forEach((expense) => {
          if (expense.horse?.stablemate?.name) {
            stablemateSet.add(expense.horse.stablemate?.name)
          }
        })
        
        stablemates = Array.from(stablemateSet).sort()
      }
    }

    return NextResponse.json({ expenses, stablemates })
  } catch (error) {
    console.error('Fetch expenses error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

