import { NextResponse } from 'next/server'
import { getAdminPrismaClient } from '@/lib/admin-prisma'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      role: string
    }

    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use admin Prisma client (respects database switch preference)
    const prisma = getAdminPrismaClient()

    const racecourseId = params.id

    await prisma.racecourse.delete({
      where: { id: racecourseId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete racecourse error:', error)
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Bu hipodroma bağlı veriler olduğu için silinemiyor' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Hipodrom silinirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

