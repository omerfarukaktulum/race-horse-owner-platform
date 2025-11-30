'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

interface Horse {
  id: string
  name: string
  yob?: number | null
  gender?: string | null
  status?: string | null
}

interface DeleteHorseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  stablemateId: string
  ownerName: string
  onSuccess?: () => void
}

export default function DeleteHorseModal({
  open,
  onOpenChange,
  userId,
  stablemateId,
  ownerName,
  onSuccess,
}: DeleteHorseModalProps) {
  const [horses, setHorses] = useState<Horse[]>([])
  const [allHorses, setAllHorses] = useState<Horse[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [deletingHorseId, setDeletingHorseId] = useState<string | null>(null)

  useEffect(() => {
    if (open && stablemateId) {
      // Set admin target user cookie
      document.cookie = `admin-target-user-id=${userId}; path=/; max-age=3600`
      fetchHorses()
    } else if (!open) {
      // Clear cookie when modal closes
      document.cookie = 'admin-target-user-id=; path=/; max-age=0'
      setHorses([])
      setAllHorses([])
      setSearchQuery('')
      setDeletingHorseId(null)
    }
  }, [open, userId, stablemateId])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setHorses(allHorses)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = allHorses.filter(
        (horse) =>
          horse.name.toLowerCase().includes(query) ||
          horse.yob?.toString().includes(query) ||
          horse.gender?.toLowerCase().includes(query) ||
          horse.status?.toLowerCase().includes(query)
      )
      setHorses(filtered)
    }
  }, [searchQuery, allHorses])

  const fetchHorses = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/horses?targetUserId=${userId}`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Atlar yüklenemedi')
      }

      setAllHorses(data.horses || [])
      setHorses(data.horses || [])
    } catch (error: any) {
      console.error('Fetch horses error:', error)
      toast.error(error.message || 'Atlar yüklenirken bir hata oluştu')
      setHorses([])
      setAllHorses([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteHorse = async (horseId: string, horseName: string) => {
    if (!confirm(`"${horseName}" adlı atı silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      return
    }

    setDeletingHorseId(horseId)
    try {
      const response = await fetch(`/api/horses/${horseId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'At silinemedi')
      }

      toast.success(`"${horseName}" başarıyla silindi`)
      
      // Remove horse from list
      setAllHorses((prev) => prev.filter((h) => h.id !== horseId))
      setHorses((prev) => prev.filter((h) => h.id !== horseId))

      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Delete horse error:', error)
      toast.error(error.message || 'At silinirken bir hata oluştu')
    } finally {
      setDeletingHorseId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>At Sil - {ownerName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {/* Search */}
          <div className="flex-shrink-0 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="At ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Horses List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">Yükleniyor...</div>
              </div>
            ) : horses.length === 0 ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">
                  {searchQuery ? 'Arama sonucu bulunamadı' : 'At bulunamadı'}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {horses.map((horse) => (
                  <Card key={horse.id} className="hover:bg-gray-50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{horse.name}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {horse.yob && <span>Doğum: {horse.yob}</span>}
                            {horse.yob && horse.gender && <span className="mx-2">•</span>}
                            {horse.gender && <span>Cinsiyet: {horse.gender}</span>}
                            {(horse.yob || horse.gender) && horse.status && <span className="mx-2">•</span>}
                            {horse.status && <span>Durum: {horse.status}</span>}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteHorse(horse.id, horse.name)}
                          disabled={deletingHorseId === horse.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 ml-4 flex-shrink-0"
                        >
                          {deletingHorseId === horse.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-red-600 border-t-transparent mr-2"></div>
                              Siliniyor...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3 mr-1" />
                              Sil
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

