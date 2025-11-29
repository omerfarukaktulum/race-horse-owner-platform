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

export default function AdminUsersTab() {
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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterRole('')}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filterRole === '' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setFilterRole('OWNER')}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filterRole === 'OWNER' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Sahipler
          </button>
          <button
            onClick={() => setFilterRole('TRAINER')}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filterRole === 'TRAINER' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Antrenörler
          </button>
          <button
            onClick={() => setFilterRole('ADMIN')}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filterRole === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Adminler
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {users.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              Kullanıcı bulunamadı
            </CardContent>
          </Card>
        ) : (
          users.map((user) => (
            <Card key={user.id} className="py-2">
              <CardHeader className="pb-2 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{user.email}</CardTitle>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Kayıt: {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(
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
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                {user.ownerProfile && (
                  <div className="space-y-1 text-sm">
                    <p className="truncate">
                      <span className="font-medium text-xs">Resmi Ad:</span>{' '}
                      <span className="text-gray-700">{user.ownerProfile.officialName}</span>
                    </p>
                    {user.ownerProfile.stablemate && (
                      <>
                        <p className="truncate">
                          <span className="font-medium text-xs">Eküri:</span>{' '}
                          <span className="text-gray-700">{user.ownerProfile.stablemate.name}</span>
                        </p>
                        {user.ownerProfile.stablemate?.dataFetchStatus && (
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <span className="font-medium text-xs">Veri Yükleme:</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
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
                        <span className="font-medium text-xs">Abonelik:</span>{' '}
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
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
                  <div className="space-y-1 text-sm">
                    <p className="truncate">
                      <span className="font-medium text-xs">Ad Soyad:</span>{' '}
                      <span className="text-gray-700">{user.trainerProfile.fullName}</span>
                    </p>
                    {user.trainerProfile.phone && (
                      <p className="truncate">
                        <span className="font-medium text-xs">Telefon:</span>{' '}
                        <span className="text-gray-700">{user.trainerProfile.phone}</span>
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

