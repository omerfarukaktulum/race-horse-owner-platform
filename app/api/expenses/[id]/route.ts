import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

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

async function getExpenseWithRelations(expenseId: string) {
  return prisma.expense.findUnique({
    where: { id: expenseId },
      include: {
        horse: {
          include: {
            stablemate: true,
          },
        },
      },
    })
}

function canModifyExpense(decoded: DecodedToken, expense: any) {
  if (decoded.role === 'ADMIN') return true
  if (decoded.role === 'OWNER') {
    return expense.horse.stablemate.ownerId === decoded.ownerId
  }
  if (decoded.role === 'TRAINER') {
    return expense.horse.trainerId === decoded.trainerId
  }
  return false
}

function parsePhotoUrls(input?: string | string[] | null) {
  if (!input) return []
  if (Array.isArray(input)) {
    return input.filter((item): item is string => typeof item === 'string' && !!item.trim())
  }
  const trimmed = input.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && !!item.trim())
      }
    } catch {
      // ignore
    }
  }
  return [trimmed]
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

    const expense = await getExpenseWithRelations(params.id)

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    if (!canModifyExpense(decoded, expense)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.expense.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete expense error:', error)
    return NextResponse.json(
      { error: 'Failed to delete expense' },
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

    const expense = await getExpenseWithRelations(params.id)

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    if (!canModifyExpense(decoded, expense)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const updateData: any = {}

    const date = formData.get('date') as string | null
    if (date) {
      const selectedDate = new Date(date)
      const now = new Date()
      updateData.date = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
      )
    }

    const category = formData.get('category') as string | null
    if (category) {
      updateData.category = category
    }

    const customName = formData.get('customName') as string | null
    if (customName !== null) {
      updateData.customName = customName || null
    }

    const amount = formData.get('amount') as string | null
    if (amount) {
      updateData.amount = parseFloat(amount)
    }

    const currency = formData.get('currency') as string | null
    if (currency) {
      updateData.currency = currency
    }

    const note = formData.get('notes') as string | null
    if (note !== null) {
      updateData.note = note || null
    }

    const photos = formData
      .getAll('photos')
      .filter((item): item is File => item instanceof File && item.size > 0)
    if (photos.length > 0) {
      const newPhotoUrls: string[] = []
      for (const photo of photos) {
        const bytes = await photo.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64 = buffer.toString('base64')
        newPhotoUrls.push(`data:${photo.type};base64,${base64}`)
      }

      const existingPhotoUrls = parsePhotoUrls(expense.photoUrl)
      const mergedPhotoUrls = [...existingPhotoUrls, ...newPhotoUrls]

      if (mergedPhotoUrls.length > 0) {
        updateData.photoUrl = JSON.stringify(mergedPhotoUrls)
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ success: true, expense: updatedExpense })
  } catch (error) {
    console.error('Update expense error:', error)
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    )
  }
}

