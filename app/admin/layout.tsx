import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import Link from 'next/link'
import AdminNavbar from './components/AdminNavbar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')

  if (!token) {
    redirect('/admin-signin')
  }

  try {
    const decoded = verify(token.value, process.env.NEXTAUTH_SECRET!) as {
      role: string
    }

    if (decoded.role !== 'ADMIN') {
      redirect('/app/home')
    }
  } catch (error) {
    redirect('/admin-signin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      {children}
    </div>
  )
}






