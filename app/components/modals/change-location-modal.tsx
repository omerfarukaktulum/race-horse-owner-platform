'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'

interface Racecourse {
  id: string
  name: string
}

interface Farm {
  id: string
  name: string
}

interface ChangeLocationModalProps {
  open: boolean
  onClose: () => void
  horseId: string
  horseName: string
  currentRacecourseId?: string
  currentFarmId?: string
  onSuccess?: () => void
}

export function ChangeLocationModal({
  open,
  onClose,
  horseId,
  horseName,
  currentRacecourseId,
  currentFarmId,
  onSuccess,
}: ChangeLocationModalProps) {
  const [racecourses, setRacecourses] = useState<Racecourse[]>([])
  const [farms, setFarms] = useState<Farm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [locationType, setLocationType] = useState<'racecourse' | 'farm'>('racecourse')
  const [racecourseId, setRacecourseId] = useState(currentRacecourseId || '')
  const [farmId, setFarmId] = useState(currentFarmId || '')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (open) {
      fetchReferenceData()
      setRacecourseId(currentRacecourseId || '')
      setFarmId(currentFarmId || '')
      setStartDate(new Date().toISOString().split('T')[0])
      // Determine location type based on current values
      if (currentRacecourseId) {
        setLocationType('racecourse')
      } else if (currentFarmId) {
        setLocationType('farm')
      }
    }
  }, [open, currentRacecourseId, currentFarmId])

  const fetchReferenceData = async () => {
    setIsLoading(true)
    try {
      const [racecoursesRes, farmsRes] = await Promise.all([
        fetch('/api/racecourses'),
        fetch('/api/farms'),
      ])

      if (racecoursesRes.ok) {
        const data = await racecoursesRes.json()
        setRacecourses(data.racecourses || [])
      }

      if (farmsRes.ok) {
        const data = await farmsRes.json()
        setFarms(data.farms || [])
      }
    } catch (error) {
      console.error('Error fetching reference data:', error)
      toast.error('Referans verileri yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (locationType === 'racecourse' && !racecourseId) {
      toast.error('Lütfen bir hipodrom seçin')
      return
    }

    if (locationType === 'farm' && !farmId) {
      toast.error('Lütfen bir çiftlik seçin')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/horses/${horseId}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          locationType,
          racecourseId: locationType === 'racecourse' ? racecourseId : null,
          farmId: locationType === 'farm' ? farmId : null,
          startDate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Konum güncellenemedi')
      }

      toast.success('Konum başarıyla güncellendi')
      onSuccess?.()
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Konum Değiştir - {horseName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location Type */}
          <div className="space-y-2">
            <Label>Konum Tipi *</Label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="racecourse"
                  checked={locationType === 'racecourse'}
                  onChange={(e) => {
                    setLocationType('racecourse')
                    setFarmId('')
                  }}
                  className="w-4 h-4"
                />
                <span>Hipodrom</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="farm"
                  checked={locationType === 'farm'}
                  onChange={(e) => {
                    setLocationType('farm')
                    setRacecourseId('')
                  }}
                  className="w-4 h-4"
                />
                <span>Çiftlik</span>
              </label>
            </div>
          </div>

          {/* Racecourse Selection */}
          {locationType === 'racecourse' && (
            <div className="space-y-2">
              <Label htmlFor="racecourse">Hipodrom *</Label>
              {isLoading ? (
                <p className="text-sm text-gray-500">Yükleniyor...</p>
              ) : (
                <select
                  id="racecourse"
                  value={racecourseId}
                  onChange={(e) => setRacecourseId(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Hipodrom seçin</option>
                  {racecourses.map((rc) => (
                    <option key={rc.id} value={rc.id}>
                      {rc.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Farm Selection */}
          {locationType === 'farm' && (
            <div className="space-y-2">
              <Label htmlFor="farm">Çiftlik *</Label>
              {isLoading ? (
                <p className="text-sm text-gray-500">Yükleniyor...</p>
              ) : (
                <select
                  id="farm"
                  value={farmId}
                  onChange={(e) => setFarmId(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Çiftlik seçin</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Başlangıç Tarihi *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

