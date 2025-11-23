'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { Activity } from 'lucide-react'

type TrainingPlanModalMode = 'create' | 'edit'

const DISTANCE_OPTIONS = ['Kenter', 'Tırıs', '200', '400', '600', '800', '1000', '1200', '1400', '1600']

interface InitialTrainingPlanValues {
  planDate: string
  distance: string
  note?: string | null
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
  const distanceSelectRef = useRef<HTMLSelectElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [modalJustOpened, setModalJustOpened] = useState(false)

  const isEditMode = mode === 'edit'

  // Track when modal just opened to prevent auto-opening select/date picker on mobile
  useEffect(() => {
    if (open) {
      setModalJustOpened(true)
      // Blur all select and date input elements immediately to prevent auto-opening on mobile
      const blurInputs = () => {
        if (distanceSelectRef.current) {
          distanceSelectRef.current.blur()
        }
        if (dateInputRef.current) {
          dateInputRef.current.blur()
        }
        // Also blur any other focused select or input elements
        const focusedElement = document.activeElement as HTMLElement
        if (focusedElement) {
          if (focusedElement.tagName === 'SELECT' || focusedElement.tagName === 'INPUT') {
            focusedElement.blur()
          }
        }
      }
      
      // Blur immediately
      blurInputs()
      
      // Blur after a short delay to catch any late focus
      const timer1 = setTimeout(blurInputs, 50)
      const timer2 = setTimeout(blurInputs, 150)
      const timer3 = setTimeout(blurInputs, 300)
      const timer4 = setTimeout(() => setModalJustOpened(false), 500)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearTimeout(timer4)
      }
    } else {
      setModalJustOpened(false)
    }
  }, [open])

  // Prevent select from opening on mobile when modal just opened
  const handleSelectMouseDown = (e: React.MouseEvent<HTMLSelectElement>) => {
    if (modalJustOpened) {
      e.preventDefault()
      e.stopPropagation()
      // Allow opening after a short delay
      setTimeout(() => {
        setModalJustOpened(false)
      }, 100)
    }
  }

  const handleSelectTouchStart = (e: React.TouchEvent<HTMLSelectElement>) => {
    if (modalJustOpened) {
      e.preventDefault()
      e.stopPropagation()
      // Allow opening after a short delay
      setTimeout(() => {
        setModalJustOpened(false)
      }, 100)
    }
  }

  // Prevent date picker from opening on mobile when modal just opened
  const handleDateInputMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
    if (modalJustOpened) {
      e.preventDefault()
      e.stopPropagation()
      // Allow opening after a short delay
      setTimeout(() => {
        setModalJustOpened(false)
      }, 100)
    }
  }

  const handleDateInputTouchStart = (e: React.TouchEvent<HTMLInputElement>) => {
    if (modalJustOpened) {
      e.preventDefault()
      e.stopPropagation()
      // Allow opening after a short delay
      setTimeout(() => {
        setModalJustOpened(false)
      }, 100)
    }
  }

  // Initialize form with existing data
  useEffect(() => {
    if (open) {
      if (isEditMode && initialPlan) {
        setPlanDate(initialPlan.planDate ? new Date(initialPlan.planDate).toISOString().split('T')[0] : '')
        setDistance(initialPlan.distance || '')
        setNote(initialPlan.note || '')
      } else {
        // Reset form for create mode
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setPlanDate(tomorrow.toISOString().split('T')[0])
        setDistance('')
        setNote('')
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
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <Activity className="h-8 w-8 text-white" />
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="w-[240px] mx-auto space-y-5">
            {/* Plan Date */}
            <div className="space-y-2">
              <Label htmlFor="planDate" className="text-gray-700 font-medium">
                Tarih <span className="text-red-500">*</span>
              </Label>
              <div style={modalJustOpened ? { pointerEvents: 'none' } : undefined}>
                <Input
                  ref={dateInputRef}
                  id="planDate"
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  min={new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]}
                  required
                  disabled={isSubmitting || modalJustOpened}
                  autoFocus={false}
                  onMouseDown={handleDateInputMouseDown}
                  onTouchStart={handleDateInputTouchStart}
                  onFocus={(e) => {
                    // Prevent auto-opening on mobile by blurring if modal just opened
                    if (modalJustOpened) {
                      e.preventDefault()
                      e.stopPropagation()
                      setTimeout(() => {
                        e.target.blur()
                      }, 0)
                    }
                  }}
                  onClick={(e) => {
                    // Prevent date picker from opening if modal just opened
                    if (modalJustOpened) {
                      e.preventDefault()
                      e.stopPropagation()
                      setTimeout(() => {
                        setModalJustOpened(false)
                      }, 100)
                    }
                  }}
                  className="h-11 w-full border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1] [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>

            {/* Distance */}
            <div className="space-y-2">
              <Label htmlFor="distance" className="text-gray-700 font-medium">
                İdman Mesafesi <span className="text-red-500">*</span>
              </Label>
              <select
                ref={distanceSelectRef}
                id="distance"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                onMouseDown={handleSelectMouseDown}
                onTouchStart={handleSelectTouchStart}
                onFocus={(e) => {
                  // Prevent auto-opening on mobile by blurring if modal just opened
                  if (modalJustOpened) {
                    setTimeout(() => {
                      e.target.blur()
                    }, 0)
                  }
                }}
                required
                disabled={isSubmitting}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Mesafe seçin...</option>
                {DISTANCE_OPTIONS.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist === 'Kenter' || dist === 'Tırıs' ? dist : `${dist}m`}
                  </option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note" className="text-gray-700 font-medium">
                Not
              </Label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="İdman planı hakkında notlar..."
                disabled={isSubmitting}
                className="flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50"
                rows={4}
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4">
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
        </form>
      </DialogContent>
    </Dialog>
  )
}

