'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Racecourse {
  id: string
  name: string
}

export default function AdminRacecoursesTab() {
  const [racecourses, setRacecourses] = useState<Racecourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchRacecourses()
  }, [])

  const fetchRacecourses = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/racecourses', {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Hipodromlar yüklenemedi')
      }

      setRacecourses(data.racecourses || [])
    } catch (error) {
      console.error('Fetch racecourses error:', error)
      toast.error('Hipodromlar yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newName.trim()) {
      toast.error('Hipodrom adı gerekli')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/racecourses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Hipodrom oluşturulamadı')
      }

      toast.success('Hipodrom başarıyla oluşturuldu')
      setNewName('')
      fetchRacecourses()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hipodrom oluşturulurken bir hata oluştu'
      toast.error(message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `"${name}" hipodromunu silmek istediğinize emin misiniz?`
    )

    if (!confirmed) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`/api/admin/racecourses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Hipodrom silinemedi')
      }

      toast.success('Hipodrom başarıyla silindi')
      fetchRacecourses()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hipodrom silinirken bir hata oluştu'
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
          <CardTitle>Yeni Hipodrom Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="name" className="sr-only">Hipodrom Adı</Label>
              <Input
                id="name"
                placeholder="Hipodrom adı"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
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

      {/* Racecourses List */}
      <div className="space-y-2">
        {racecourses.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              Henüz hipodrom eklenmemiş
            </CardContent>
          </Card>
        ) : (
          racecourses.map((racecourse) => (
            <Card key={racecourse.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{racecourse.name}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(racecourse.id, racecourse.name)}
                    disabled={deletingId === racecourse.id}
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

