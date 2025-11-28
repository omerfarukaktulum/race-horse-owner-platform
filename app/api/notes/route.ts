import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 0, 1), 25) : null

    // Build filter
    const where: any = {}

    if (horseId) {
      where.horseId = horseId
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
        // Trainers should see notes for:
        // 1. Horses assigned to them (horse.trainerId = trainerId)
        // 2. Notes they added themselves (addedById = userId)
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

    // Fetch notes
    const notes = await prisma.horseNote.findMany({
      where,
      select: {
        id: true,
        date: true,
        createdAt: true,
        note: true,
        photoUrl: true,
        kiloValue: true,
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
      orderBy: {
        date: 'desc',
      },
      ...(limit ? { take: limit } : {}),
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
        
        // 2. Notes added by trainer
        const trainerNotes = await prisma.horseNote.findMany({
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
        trainerNotes.forEach((note) => {
          if (note.horse?.stablemate?.name) {
            stablemateSet.add(note.horse.stablemate?.name)
          }
        })
        
        stablemates = Array.from(stablemateSet).sort()
      }
    }

    return NextResponse.json({ notes, stablemates })
  } catch (error) {
    console.error('Fetch notes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

