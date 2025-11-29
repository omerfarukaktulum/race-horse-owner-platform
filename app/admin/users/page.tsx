'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Trash2 } from 'lucide-react'
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
      dataFetchStatus?: string | null
      dataFetchStartedAt?: string | null
      dataFetchCompletedAt?: string | null
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
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

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

  const handleDelete = async (userId: string, userEmail: string) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `"${userEmail}" kullanıcısını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz ve kullanıcıya ait tüm veriler silinecektir.`
    )

    if (!confirmed) {
      return
    }

    setDeletingUserId(userId)

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kullanıcı silinemedi')
      }

      toast.success('Kullanıcı başarıyla silindi')
      
      // Refresh users list
      fetchUsers()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kullanıcı silinirken bir hata oluştu'
      toast.error(message)
    } finally {
      setDeletingUserId(null)
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
                <div className="flex-1">
                  <CardTitle className="text-lg">{user.email}</CardTitle>
                  <p className="text-sm text-gray-500">
                    Kayıt: {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded text-sm font-medium ${getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    {user.role}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(user.id, user.email)}
                    disabled={deletingUserId === user.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
                    <>
                      <p>
                        <span className="font-medium">Eküri:</span>{' '}
                        {user.ownerProfile.stablemate.name}
                      </p>
                      {user.ownerProfile.stablemate?.dataFetchStatus && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">Veri Yükleme:</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              user.ownerProfile.stablemate.dataFetchStatus === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : user.ownerProfile.stablemate.dataFetchStatus === 'IN_PROGRESS'
                                ? 'bg-yellow-100 text-yellow-700'
                                : user.ownerProfile.stablemate.dataFetchStatus === 'FAILED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {user.ownerProfile.stablemate.dataFetchStatus === 'COMPLETED'
                              ? '✓ Tamamlandı'
                              : user.ownerProfile.stablemate.dataFetchStatus === 'IN_PROGRESS'
                              ? '⏳ Devam Ediyor'
                              : user.ownerProfile.stablemate.dataFetchStatus === 'FAILED'
                              ? '✗ Başarısız'
                              : '⏳ Beklemede'}
                          </span>
                          {user.ownerProfile.stablemate.dataFetchStartedAt && (
                            <span className="text-xs text-gray-500">
                              Başlangıç: {new Date(user.ownerProfile.stablemate.dataFetchStartedAt).toLocaleString('tr-TR')}
                            </span>
                          )}
                          {user.ownerProfile.stablemate.dataFetchCompletedAt && (
                            <span className="text-xs text-gray-500">
                              Bitiş: {new Date(user.ownerProfile.stablemate.dataFetchCompletedAt).toLocaleString('tr-TR')}
                            </span>
                          )}
                        </div>
                      )}
                    </>
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






