'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Farm {
  id: string
  name: string
  city: string | null
}

export default function AdminFarmsTab() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCity, setNewCity] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchFarms()
  }, [])

  const fetchFarms = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/farms', {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Çiftlikler yüklenemedi')
      }

      setFarms(data.farms || [])
    } catch (error) {
      console.error('Fetch farms error:', error)
      toast.error('Çiftlikler yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newName.trim()) {
      toast.error('Çiftlik adı gerekli')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/farms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newName.trim(),
          city: newCity.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Çiftlik oluşturulamadı')
      }

      toast.success('Çiftlik başarıyla oluşturuldu')
      setNewName('')
      setNewCity('')
      fetchFarms()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Çiftlik oluşturulurken bir hata oluştu'
      toast.error(message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `"${name}" çiftliğini silmek istediğinize emin misiniz?`
    )

    if (!confirmed) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`/api/admin/farms/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Çiftlik silinemedi')
      }

      toast.success('Çiftlik başarıyla silindi')
      fetchFarms()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Çiftlik silinirken bir hata oluştu'
      toast.error(message)
    } finally {
      setDeletingId(null)
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
      {/* Create Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Yeni Çiftlik Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="name">Çiftlik Adı *</Label>
              <Input
                id="name"
                placeholder="Çiftlik adı"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>
            <div>
              <Label htmlFor="city">Şehir</Label>
              <Input
                id="city"
                placeholder="Şehir (opsiyonel)"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <Button type="submit" disabled={isCreating || !newName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Ekle
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Farms List */}
      <div className="space-y-2">
        {farms.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              Henüz çiftlik eklenmemiş
            </CardContent>
          </Card>
        ) : (
          farms.map((farm) => (
            <Card key={farm.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{farm.name}</span>
                    {farm.city && (
                      <span className="text-sm text-gray-500 ml-2">({farm.city})</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(farm.id, farm.name)}
                    disabled={deletingId === farm.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

