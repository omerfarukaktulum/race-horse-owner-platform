'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Trash2, FolderX, Sparkles, UserPlus, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import ImportHorsesModal from './ImportHorsesModal'

interface User {
  id: string
  email: string
  role: string
  createdAt: string
  ownerProfile?: {
    officialName: string
    officialRef: string | null
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
  const [deletingResourcesUserId, setDeletingResourcesUserId] = useState<string | null>(null)
  const [generatingDemoDataUserId, setGeneratingDemoDataUserId] = useState<string | null>(null)
  const [importHorsesModalOpen, setImportHorsesModalOpen] = useState(false)
  const [selectedOwnerForImport, setSelectedOwnerForImport] = useState<{
    userId: string
    ownerName: string
    ownerRef: string
  } | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)

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

  const handleEditEmail = (user: User) => {
    setEditingUserId(user.id)
    setEditEmail(user.email)
  }

  const handleUpdateEmail = async () => {
    if (!editingUserId) return

    if (!editEmail.trim()) {
      toast.error('E-posta adresi boş olamaz')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editEmail.trim())) {
      toast.error('Geçersiz e-posta formatı')
      return
    }

    setIsUpdatingEmail(true)

    try {
      const response = await fetch(`/api/admin/users/${editingUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: editEmail.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'E-posta güncellenemedi')
      }

      toast.success('E-posta adresi başarıyla güncellendi')
      setEditingUserId(null)
      setEditEmail('')
      fetchUsers() // Refresh users list
    } catch (error: any) {
      console.error('Update email error:', error)
      toast.error(error.message || 'E-posta güncellenirken bir hata oluştu')
    } finally {
      setIsUpdatingEmail(false)
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

  const handleDeleteResources = async (userId: string, userEmail: string, ownerName: string) => {
    const confirmed = window.confirm(
      `"${ownerName}" (${userEmail}) için tüm kaynakları silmek istediğinize emin misiniz?\n\nBu işlem şunları silecektir:\n- Tüm giderler (at bazlı ve eküri genel giderler)\n- Tüm notlar\n- Tüm hastalık kayıtları\n- Tüm yasaklı ilaçlar\n- Tüm antrenman planları\n- Tüm kayıtlar (registrations)\n- Tüm konum geçmişi\n- Tüm diğer ilgili veriler\n\nKorunacaklar:\n- Kullanıcı hesabı\n- Sahip profili\n- Eküri bilgisi\n- Atlar (horses)\n- İdmanlar (gallops)\n- Yarış geçmişi (race history)\n\nBu işlem geri alınamaz!`
    )

    if (!confirmed) {
      return
    }

    setDeletingResourcesUserId(userId)

    try {
      const response = await fetch(`/api/admin/users/${userId}/resources`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kaynaklar silinemedi')
      }

      const deletedCount = data.deleted?.total || 0
      toast.success(
        data.message ||
          `Başarıyla ${deletedCount} kayıt silindi (idmanlar, yarışlar, giderler, notlar, vb.). Atlar korundu.`
      )
      fetchUsers()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kaynaklar silinirken bir hata oluştu'
      toast.error(message)
    } finally {
      setDeletingResourcesUserId(null)
    }
  }

  const handleGenerateDemoData = async (userId: string, userEmail: string, ownerName: string) => {
    const confirmed = window.confirm(
      `"${ownerName}" (${userEmail}) için demo veri oluşturmak istediğinize emin misiniz?\n\nBu işlem şunları oluşturacaktır:\n- Her at için 5-10 gider (expenses)\n- Her at için 5-10 not (notes)\n- Bazı atlar için hastalık kayıtları (illnesses)\n- Bazı atlar için yasaklı ilaç kayıtları (banned medicines)\n- Her at için 1-3 antrenman planı (training plans)\n\nMevcut veriler korunacak, yeni veriler eklenecektir.`
    )

    if (!confirmed) {
      return
    }

    setGeneratingDemoDataUserId(userId)

    try {
      const response = await fetch(`/api/admin/users/${userId}/generate-demo-data`, {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Demo veri oluşturulamadı')
      }

      const total = data.total || 0
      toast.success(
        `Demo veri başarıyla oluşturuldu! ${total} kayıt eklendi (${data.created?.expenses || 0} gider, ${data.created?.notes || 0} not, ${data.created?.illnesses || 0} hastalık, vb.)`
      )
      fetchUsers()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Demo veri oluşturulurken bir hata oluştu'
      toast.error(message)
    } finally {
      setGeneratingDemoDataUserId(null)
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
                      onClick={() => handleEditEmail(user)}
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 h-7 w-7 p-0"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
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
                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (user.ownerProfile?.officialRef) {
                                setSelectedOwnerForImport({
                                  userId: user.id,
                                  ownerName: user.ownerProfile.officialName,
                                  ownerRef: user.ownerProfile.officialRef,
                                })
                                setImportHorsesModalOpen(true)
                              } else {
                                toast.error('TJK ID bulunamadı. Lütfen önce sahip profilini oluşturun.')
                              }
                            }}
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 h-6 px-2 text-xs"
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            At Ekle
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleGenerateDemoData(
                                user.id,
                                user.email,
                                user.ownerProfile!.officialName
                              )
                            }
                            disabled={generatingDemoDataUserId === user.id}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 h-6 px-2 text-xs"
                          >
                            {generatingDemoDataUserId === user.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                                Oluşturuluyor...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 mr-1" />
                                Demo Veri Oluştur
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDeleteResources(
                                user.id,
                                user.email,
                                user.ownerProfile!.officialName
                              )
                            }
                            disabled={deletingResourcesUserId === user.id}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 h-6 px-2 text-xs"
                          >
                            {deletingResourcesUserId === user.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600 mr-1"></div>
                                Siliniyor...
                              </>
                            ) : (
                              <>
                                <FolderX className="h-3 w-3 mr-1" />
                                Kaynakları Sil
                              </>
                            )}
                          </Button>
                        </div>
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

      {/* Edit Email Dialog */}
      <Dialog open={editingUserId !== null} onOpenChange={(open) => !open && setEditingUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-posta Adresini Güncelle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-email">Yeni E-posta Adresi</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="ornek@email.com"
                disabled={isUpdatingEmail}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingUserId(null)
                setEditEmail('')
              }}
              disabled={isUpdatingEmail}
            >
              İptal
            </Button>
            <Button
              onClick={handleUpdateEmail}
              disabled={isUpdatingEmail || !editEmail.trim()}
            >
              {isUpdatingEmail ? 'Güncelleniyor...' : 'Güncelle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Horses Modal */}
      {selectedOwnerForImport && (
        <ImportHorsesModal
          open={importHorsesModalOpen}
          onOpenChange={setImportHorsesModalOpen}
          userId={selectedOwnerForImport.userId}
          ownerName={selectedOwnerForImport.ownerName}
          ownerRef={selectedOwnerForImport.ownerRef}
          onSuccess={() => {
            fetchUsers()
          }}
        />
      )}
    </div>
  )
}

