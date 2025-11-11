'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  role: string
  createdAt: string
  ownerProfile?: {
    officialName: string
    subscriptionStatus: string | null
    stablemate: {
      name: string
    } | null
  }
  trainerProfile?: {
    fullName: string
    phone: string | null
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterRole, setFilterRole] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [filterRole])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const params = filterRole ? `?role=${filterRole}` : ''
      const response = await fetch(`/api/admin/users${params}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kullanıcılar yüklenemedi')
      }

      setUsers(data.users || [])
    } catch (error) {
      console.error('Fetch users error:', error)
      toast.error('Kullanıcılar yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-700'
      case 'OWNER':
        return 'bg-blue-100 text-blue-700'
      case 'TRAINER':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Kullanıcı Yönetimi</h1>
        <p className="text-gray-600">Toplam {users.length} kullanıcı</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterRole('')}
              className={`px-4 py-2 rounded ${
                filterRole === '' ? 'bg-indigo-600 text-white' : 'bg-gray-100'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilterRole('OWNER')}
              className={`px-4 py-2 rounded ${
                filterRole === 'OWNER' ? 'bg-indigo-600 text-white' : 'bg-gray-100'
              }`}
            >
              Sahipler
            </button>
            <button
              onClick={() => setFilterRole('TRAINER')}
              className={`px-4 py-2 rounded ${
                filterRole === 'TRAINER' ? 'bg-indigo-600 text-white' : 'bg-gray-100'
              }`}
            >
              Antrenörler
            </button>
            <button
              onClick={() => setFilterRole('ADMIN')}
              className={`px-4 py-2 rounded ${
                filterRole === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-gray-100'
              }`}
            >
              Adminler
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{user.email}</CardTitle>
                  <p className="text-sm text-gray-500">
                    Kayıt: {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${getRoleBadgeColor(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {user.ownerProfile && (
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Resmi Ad:</span>{' '}
                    {user.ownerProfile.officialName}
                  </p>
                  {user.ownerProfile.stablemate && (
                    <p>
                      <span className="font-medium">Eküri:</span>{' '}
                      {user.ownerProfile.stablemate.name}
                    </p>
                  )}
                  {user.ownerProfile.subscriptionStatus && (
                    <p>
                      <span className="font-medium">Abonelik:</span>{' '}
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          user.ownerProfile.subscriptionStatus === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {user.ownerProfile.subscriptionStatus}
                      </span>
                    </p>
                  )}
                </div>
              )}
              {user.trainerProfile && (
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Ad Soyad:</span>{' '}
                    {user.trainerProfile.fullName}
                  </p>
                  {user.trainerProfile.phone && (
                    <p>
                      <span className="font-medium">Telefon:</span>{' '}
                      {user.trainerProfile.phone}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

