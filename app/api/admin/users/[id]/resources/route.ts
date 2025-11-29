import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { getAdminPrismaClient } from '@/lib/admin-prisma'

/**
 * Delete all resources for a user (gallops, races, expenses, notes, etc.)
 * but keep the user, ownerProfile, stablemate, and horses
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Admin authentication check
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      role: string
    }

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin only' },
        { status: 403 }
      )
    }

    const userId = params.id

    // Use admin Prisma client (respects database switch preference)
    const prisma = getAdminPrismaClient()

    // Verify user exists and is an OWNER
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownerProfile: {
          include: {
            stablemate: {
              include: {
                horses: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'This operation is only available for OWNER users' },
        { status: 400 }
      )
    }

    if (!user.ownerProfile) {
      return NextResponse.json(
        { error: 'Owner profile not found' },
        { status: 404 }
      )
    }

    if (!user.ownerProfile.stablemate) {
      return NextResponse.json(
        { error: 'Stablemate not found. No resources to delete.' },
        { status: 404 }
      )
    }

    const stablemate = user.ownerProfile.stablemate
    const horseIds = stablemate.horses.map((h) => h.id)

    if (horseIds.length === 0) {
      return NextResponse.json({
        message: 'No horses found. No resources to delete.',
        deleted: {
          gallops: 0,
          races: 0,
          expenses: 0,
          notes: 0,
          illnesses: 0,
          bannedMedicines: 0,
          trainingPlans: 0,
          registrations: 0,
          locationHistory: 0,
        },
      })
    }

    // Delete all related resources but keep horses:
    // - expenses (Expense[])
    // - locationHistory (HorseLocationHistory[])
    // - raceHistory (HorseRaceHistory[])
    // - registrations (HorseRegistration[])
    // - gallops (HorseGallop[])
    // - notes (HorseNote[])
    // - illnesses (HorseIllness[])
    // - bannedMedicines (HorseBannedMedicine[])
    // - trainingPlans (HorseTrainingPlan[])
    
    const [gallopsResult, racesResult, expensesResult, notesResult, illnessesResult, bannedMedicinesResult, trainingPlansResult, registrationsResult, locationHistoryResult] = await Promise.all([
      prisma.horseGallop.deleteMany({
        where: { horseId: { in: horseIds } },
      }),
      prisma.horseRaceHistory.deleteMany({
        where: { horseId: { in: horseIds } },
      }),
      prisma.expense.deleteMany({
        where: { horseId: { in: horseIds } },
      }),
      prisma.horseNote.deleteMany({
        where: { horseId: { in: horseIds } },
      }),
      prisma.horseIllness.deleteMany({
        where: { horseId: { in: horseIds } },
      }),
      prisma.horseBannedMedicine.deleteMany({
        where: { horseId: { in: horseIds } },
      }),
      prisma.horseTrainingPlan.deleteMany({
        where: { horseId: { in: horseIds } },
      }),
      prisma.horseRegistration.deleteMany({
        where: { horseId: { in: horseIds } },
      }),
      prisma.horseLocationHistory.deleteMany({
        where: { horseId: { in: horseIds } },
      }),
    ])

    // Also delete illness operations (they're related to illnesses via illnessId)
    // First get all illness IDs, then delete operations
    const illnessIds = await prisma.horseIllness.findMany({
      where: { horseId: { in: horseIds } },
      select: { id: true },
    })
    
    const illnessOperationsResult = await prisma.horseIllnessOperation.deleteMany({
      where: {
        illnessId: { in: illnessIds.map((i) => i.id) },
      },
    })

    const totalDeleted =
      gallopsResult.count +
      racesResult.count +
      expensesResult.count +
      notesResult.count +
      illnessesResult.count +
      bannedMedicinesResult.count +
      trainingPlansResult.count +
      registrationsResult.count +
      locationHistoryResult.count +
      illnessOperationsResult.count

    console.log(
      `[Admin Delete Resources] Deleted resources for ${horseIds.length} horses for user ${userId}:`,
      {
        gallops: gallopsResult.count,
        races: racesResult.count,
        expenses: expensesResult.count,
        notes: notesResult.count,
        illnesses: illnessesResult.count,
        bannedMedicines: bannedMedicinesResult.count,
        trainingPlans: trainingPlansResult.count,
        registrations: registrationsResult.count,
        locationHistory: locationHistoryResult.count,
        illnessOperations: illnessOperationsResult.count,
      }
    )

    return NextResponse.json({
      message: `Successfully deleted all resources for ${user.email}`,
      deleted: {
        gallops: gallopsResult.count,
        races: racesResult.count,
        expenses: expensesResult.count,
        notes: notesResult.count,
        illnesses: illnessesResult.count,
        bannedMedicines: bannedMedicinesResult.count,
        trainingPlans: trainingPlansResult.count,
        registrations: registrationsResult.count,
        locationHistory: locationHistoryResult.count,
        illnessOperations: illnessOperationsResult.count,
        total: totalDeleted,
      },
      kept: {
        user: true,
        ownerProfile: true,
        stablemate: true,
        horses: horseIds.length,
      },
    })
  } catch (error: any) {
    console.error('[Admin Delete Resources] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete resources', message: error.message },
      { status: 500 }
    )
  }
}

