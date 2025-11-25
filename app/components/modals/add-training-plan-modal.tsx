'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import {
  ModalDateField,
  ModalSelect,
  ModalTextarea,
} from '@/app/components/ui/modal-field'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { NotebookPen, MapPin, Ruler } from 'lucide-react'
import { useModalInteractionGuard } from '@/app/hooks/use-modal-interaction-guard'

type TrainingPlanModalMode = 'create' | 'edit'

const DISTANCE_OPTIONS = ['Kenter', 'Tırıs', '200', '400', '600', '800', '1000', '1200', '1400', '1600']

// Racecourse cities (same as in change-location-modal)
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

interface InitialTrainingPlanValues {
  planDate: string
  distance: string
  note?: string | null
  racecourseId?: string | null
}

interface AddTrainingPlanModalProps {
  open: boolean
  onClose: () => void
  horseId: string
  horseName: string
  onSuccess?: () => void
  mode?: TrainingPlanModalMode
  planId?: string
  initialPlan?: InitialTrainingPlanValues
}

export function AddTrainingPlanModal({
  open,
  onClose,
  horseId,
  horseName,
  onSuccess,
  mode = 'create',
  planId,
  initialPlan,
}: AddTrainingPlanModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [planDate, setPlanDate] = useState('')
  const [distance, setDistance] = useState('')
  const [note, setNote] = useState('')
  const [racecourseId, setRacecourseId] = useState('')
  const { guardPointerEvent, guardFocusEvent } = useModalInteractionGuard(open)

  const isEditMode = mode === 'edit'

  // Initialize form with existing data
  useEffect(() => {
    if (open) {
      if (isEditMode && initialPlan) {
        setPlanDate(initialPlan.planDate ? new Date(initialPlan.planDate).toISOString().split('T')[0] : '')
        setDistance(initialPlan.distance || '')
        setNote(initialPlan.note || '')
        setRacecourseId(initialPlan.racecourseId || '')
      } else {
        // Reset form for create mode
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setPlanDate(tomorrow.toISOString().split('T')[0])
        setDistance('')
        setNote('')
        setRacecourseId('')
      }
    }
  }, [open, isEditMode, initialPlan])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!planDate) {
      toast.error('Lütfen bir tarih seçin')
      return
    }

    if (!distance) {
      toast.error('Lütfen bir mesafe seçin')
      return
    }

    // Check if date is in the future
    const selectedDate = new Date(planDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate <= today) {
      toast.error('Plan tarihi bugünden sonra olmalıdır')
      return
    }

    setIsSubmitting(true)

    try {
      const url = isEditMode && planId
        ? `/api/horses/${horseId}/training-plans/${planId}`
        : `/api/horses/${horseId}/training-plans`

      const method = isEditMode ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          planDate,
          distance,
          note: note.trim() || null,
          racecourseId: racecourseId || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Bir hata oluştu')
      }

      toast.success(isEditMode ? 'İdman planı güncellendi' : 'İdman planı eklendi')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error saving training plan:', error)
      toast.error(error.message || 'İdman planı kaydedilirken bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[320px] max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50 p-4">
        <DialogHeader className="text-center sm:text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <NotebookPen className="h-8 w-8 text-white" />
            </div>
          </div>
          {horseName && (
            <div className="w-[240px] mx-auto">
              <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                {horseName}
              </DialogTitle>
            </div>
          )}
          {isEditMode && (
            <p className="text-sm text-gray-600">
              İdman Planını Düzenle
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="w-[260px] mx-auto space-y-5">
            <ModalDateField
              label="Tarih"
              required
                id="planDate"
                value={planDate}
                onChange={(e) => setPlanDate(e.target.value)}
              min={(() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                return tomorrow.toISOString().split('T')[0]
              })()}
                disabled={isSubmitting}
              onMouseDown={guardPointerEvent}
              onTouchStart={guardPointerEvent}
              onFocus={guardFocusEvent}
              onClick={guardPointerEvent}
            />

            <ModalSelect
              label="Hipodrom"
              value={racecourseId}
              onChange={(e) => setRacecourseId(e.target.value)}
              disabled={isSubmitting}
              onMouseDown={guardPointerEvent}
              onTouchStart={guardPointerEvent}
              onFocus={guardFocusEvent}
              icon={<MapPin className="h-4 w-4" />}
            >
              <option value="">Hipodrom Seçin</option>
              {RACECOURSE_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </ModalSelect>

            <ModalSelect
              label="İdman Mesafesi"
              required
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                disabled={isSubmitting}
              onMouseDown={guardPointerEvent}
              onTouchStart={guardPointerEvent}
              onFocus={guardFocusEvent}
              icon={<Ruler className="h-4 w-4" />}
              >
                <option value="">Mesafe seçin...</option>
                {DISTANCE_OPTIONS.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist === 'Kenter' || dist === 'Tırıs' ? dist : `${dist}m`}
                  </option>
                ))}
            </ModalSelect>

            <ModalTextarea
              label="Not"
                id="note"
              placeholder="İdman planı hakkında notlar..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
                rows={4}
              />

            <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !planDate || !distance}
              className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white hover:from-[#4f46e5] hover:to-[#4338ca]"
            >
              {isSubmitting ? 'Kaydediliyor...' : isEditMode ? 'Güncelle' : 'Kaydet'}
            </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

