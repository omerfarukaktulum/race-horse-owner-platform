'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import {
  ModalSelect,
  ModalDateField,
  ModalTextarea,
} from '@/app/components/ui/modal-field'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { MapPin } from 'lucide-react'
import { useModalInteractionGuard } from '@/app/hooks/use-modal-interaction-guard'

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

import { RACECOURSES } from '@/lib/constants/racecourses'

// Racecourse cities (specific cities for racecourses)
const RACECOURSE_CITIES = RACECOURSES

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
    currentLocationType || (currentRacecourseId ? 'racecourse' : 'racecourse')
  )
  const [city, setCity] = useState(currentCity || '')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const { guardPointerEvent, guardFocusEvent } = useModalInteractionGuard(open)

  useEffect(() => {
    if (open) {
      setLocationType(currentLocationType || (currentRacecourseId ? 'racecourse' : 'racecourse'))
      setCity(currentCity || '')
      setStartDate(new Date().toISOString().split('T')[0])
      setNotes('')
    }
  }, [open, currentLocationType, currentCity, currentRacecourseId])

  const availableCities = locationType === 'racecourse' ? RACECOURSE_CITIES : TURKISH_CITIES

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!city) {
      toast.error('Lütfen bir şehir seçin')
      return
    }

    if (!notes || notes.trim() === '') {
      toast.error('Lütfen not ekleyin')
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
          notes: notes.trim(),
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
      <DialogContent className="w-[320px] bg-indigo-50/95 backdrop-blur-sm shadow-xl border border-gray-200/50 p-4">
        <DialogHeader className="text-center sm:text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <MapPin className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="w-[240px] mx-auto">
            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              {horseName}
            </DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="w-[240px] mx-auto space-y-5">
            {/* Location Type */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Konum Tipi *</p>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="racecourse"
                    checked={locationType === 'racecourse'}
                    onChange={(e) => {
                      setLocationType('racecourse')
                      setCity('')
                    }}
                    className="w-4 h-4 text-[#6366f1] focus:ring-[#6366f1]"
                  />
                  <span className="text-gray-700 text-sm">Hipodrom</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="farm"
                    checked={locationType === 'farm'}
                    onChange={(e) => {
                      setLocationType('farm')
                      setCity('')
                    }}
                    className="w-4 h-4 text-[#6366f1] focus:ring-[#6366f1]"
                  />
                  <span className="text-gray-700 text-sm">Çiftlik</span>
                </label>
              </div>
            </div>

            {/* Current Location Display */}
            {(currentLocationType && currentCity) && (
              <div className="p-3 border-2 border-indigo-100/50 rounded-lg bg-gradient-to-br from-indigo-50/60 via-indigo-50/40 to-white shadow-lg">
                <p className="text-xs text-gray-600 mb-1 block font-medium">Mevcut Konum</p>
                <p className="text-sm font-medium text-gray-900">
                  {currentLocationType === 'racecourse' ? 'Hipodrom' : 'Çiftlik'}: {currentCity}
                </p>
              </div>
            )}

            <ModalSelect
              label="Şehir"
              required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={isSubmitting}
              onMouseDown={guardPointerEvent}
              onTouchStart={guardPointerEvent}
              onFocus={guardFocusEvent}
              icon={<MapPin className="h-4 w-4" />}
              >
                <option value="">{locationType === 'racecourse' ? 'Hipodrom Seçin' : 'Şehir Seçin'}</option>
                {availableCities.map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))}
            </ModalSelect>

            <ModalDateField
              label="Başlangıç Tarihi"
              required
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                disabled={isSubmitting}
              onMouseDown={guardPointerEvent}
              onTouchStart={guardPointerEvent}
              onFocus={guardFocusEvent}
              onClick={guardPointerEvent}
              />

            <ModalTextarea
              label="Not"
              required
                id="notes"
                placeholder="Not ekleyin"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />

            {/* Actions */}
            <div className="pt-2">
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="border-2 border-[#6366f1]/30 hover:bg-[#6366f1]/5 hover:border-[#6366f1]/50 text-[#6366f1]"
                >
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

