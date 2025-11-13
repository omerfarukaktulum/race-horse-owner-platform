'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'

interface ChangeLocationModalProps {
  open: boolean
  onClose: () => void
  horseId: string
  horseName: string
  currentLocationType?: 'racecourse' | 'farm'
  currentCity?: string
  currentRacecourseId?: string
  currentFarmId?: string
  onSuccess?: () => void
}

// Racecourse cities (specific cities for racecourses)
const RACECOURSE_CITIES = [
  'İstanbul Veliefendi',
  'Adana Yeşiloba',
  'Ankara 75. Yıl',
  'Bursa Osmangazi',
  'Diyarbakır',
  'Elazığ',
  'İzmir Şirinyer',
  'Kocaeli Kartepe',
  'Şanlıurfa',
  'Antalya',
]

// Common Turkish cities (for farms)
const TURKISH_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya',
  'Artvin', 'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu',
  'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır',
  'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun',
  'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta', 'İçel', 'İstanbul', 'İzmir',
  'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya',
  'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop',
  'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
  'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale',
  'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis',
  'Osmaniye', 'Düzce',
]

export function ChangeLocationModal({
  open,
  onClose,
  horseId,
  horseName,
  currentLocationType,
  currentCity,
  currentRacecourseId,
  currentFarmId,
  onSuccess,
}: ChangeLocationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [locationType, setLocationType] = useState<'racecourse' | 'farm'>(
    currentLocationType || (currentRacecourseId ? 'racecourse' : 'farm')
  )
  const [city, setCity] = useState(currentCity || '')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (open) {
      setLocationType(currentLocationType || (currentRacecourseId ? 'racecourse' : 'farm'))
      setCity(currentCity || '')
      setStartDate(new Date().toISOString().split('T')[0])
    }
  }, [open, currentLocationType, currentCity, currentRacecourseId])

  const availableCities = locationType === 'racecourse' ? RACECOURSE_CITIES : TURKISH_CITIES

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!city) {
      toast.error('Lütfen bir şehir seçin')
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
          city,
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
                    setCity('')
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
                    setCity('')
                  }}
                  className="w-4 h-4"
                />
                <span>Çiftlik</span>
              </label>
            </div>
          </div>

          {/* Current Location Display */}
          {(currentLocationType && currentCity) && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Label className="text-xs text-gray-600 mb-1">Mevcut Konum</Label>
              <p className="text-sm font-medium text-gray-900">
                {currentLocationType === 'racecourse' ? 'Hipodrom' : 'Çiftlik'}: {currentCity}
              </p>
            </div>
          )}

          {/* City Selection */}
          <div className="space-y-2">
            <Label htmlFor="city">Şehir *</Label>
            <select
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              disabled={isSubmitting}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Şehir seçin</option>
              {availableCities.map((cityName) => (
                <option key={cityName} value={cityName}>
                  {cityName}
                </option>
              ))}
            </select>
          </div>

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

