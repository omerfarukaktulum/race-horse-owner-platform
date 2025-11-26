'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import {
  ModalTextarea,
  ModalDateField,
  ModalPhotoUpload,
} from '@/app/components/ui/modal-field'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { Heart } from 'lucide-react'
import { useModalInteractionGuard } from '@/app/hooks/use-modal-interaction-guard'

type IllnessModalMode = 'create' | 'edit'

interface InitialIllnessValues {
  startDate: string
  endDate?: string | null
  detail?: string | null
  photoUrl?: string | string[] | null
}

interface AddIllnessModalProps {
  open: boolean
  onClose: () => void
  horseId: string
  horseName: string
  onSuccess?: () => void
  mode?: IllnessModalMode
  illnessId?: string
  initialIllness?: InitialIllnessValues
  submitLabel?: string
}

export function AddIllnessModal({
  open,
  onClose,
  horseId,
  horseName,
  onSuccess,
  mode = 'create',
  illnessId,
  initialIllness,
  submitLabel,
}: AddIllnessModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState<string>('')
  const [detail, setDetail] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const { isGuarded, guardPointerEvent, guardFocusEvent } = useModalInteractionGuard(open)

  const isEditMode = mode === 'edit'
  // Check if the illness already had an endDate when editing started
  const hadEndDateInitially = isEditMode && initialIllness?.endDate ? true : false

  // Helper function to convert date to YYYY-MM-DD format
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      // If it's already in YYYY-MM-DD format, return as is
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString
      }
      return ''
    }
  }

  // Initialize form when modal opens or initialIllness changes
  useEffect(() => {
    if (open) {
      if (isEditMode && initialIllness) {
        setStartDate(formatDateForInput(initialIllness.startDate))
        setEndDate(formatDateForInput(initialIllness.endDate))
        setDetail(initialIllness.detail || '')
        
        // Handle photo previews
        if (initialIllness.photoUrl) {
          try {
            const photoUrls = typeof initialIllness.photoUrl === 'string' 
              ? JSON.parse(initialIllness.photoUrl) 
              : initialIllness.photoUrl
            if (Array.isArray(photoUrls)) {
              setPhotoPreviews(photoUrls)
            } else if (typeof photoUrls === 'string') {
              setPhotoPreviews([photoUrls])
            }
          } catch {
            if (typeof initialIllness.photoUrl === 'string') {
              setPhotoPreviews([initialIllness.photoUrl])
            }
          }
        } else {
          setPhotoPreviews([])
        }
        setPhotos([])
      } else {
        setStartDate(new Date().toISOString().split('T')[0])
        setEndDate('')
        setDetail('')
        setPhotos([])
        setPhotoPreviews([])
      }
    }
  }, [open, isEditMode, initialIllness])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter((file) => file.type.startsWith('image/'))
    
    if (validFiles.length === 0) {
      toast.error('Lütfen geçerli bir resim dosyası seçin')
      return
    }

    const newPreviews: string[] = []
    validFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        newPreviews.push(reader.result as string)
        if (newPreviews.length === validFiles.length) {
          setPhotos([...photos, ...validFiles])
          setPhotoPreviews([...photoPreviews, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })

    if (e.target) {
      e.target.value = ''
    }
  }

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    const newPreviews = photoPreviews.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    setPhotoPreviews(newPreviews)
    // Reset the file input
    const fileInput = document.getElementById('illness-photo') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate) {
      toast.error('Lütfen başlangıç tarihi girin')
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('startDate', startDate)
      if (endDate) {
        formData.append('endDate', endDate)
      }
      if (detail.trim()) {
        formData.append('detail', detail.trim())
      }
      photos.forEach((photo) => {
        formData.append('photos', photo)
      })

      let response: Response
      if (isEditMode) {
        if (!illnessId) {
          throw new Error('Hastalık bulunamadı')
        }
        response = await fetch(`/api/horse-illnesses/${illnessId}`, {
          method: 'PATCH',
          credentials: 'include',
          body: formData,
        })
      } else {
        response = await fetch(`/api/horses/${horseId}/illnesses`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'İşlem başarısız')
      }

      toast.success(isEditMode ? 'Hastalık başarıyla güncellendi' : 'Hastalık başarıyla eklendi')
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
      <DialogContent className="w-[320px] max-h-[90vh] overflow-y-auto bg-indigo-50/95 backdrop-blur-sm shadow-xl border border-gray-200/50 p-4">
        <DialogHeader className="text-center sm:text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <Heart className="h-8 w-8 text-white" />
            </div>
          </div>
          {horseName && (
            <div className="w-[240px] mx-auto">
              <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5] sm:text-center">
                {horseName}
              </DialogTitle>
            </div>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="w-[260px] mx-auto space-y-5">
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

            <ModalDateField
              label="Bitiş Tarihi"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              max={new Date().toISOString().split('T')[0]}
              disabled={isSubmitting}
            />

            <ModalTextarea
              label="Detay"
              id="detail"
              placeholder="Detay Ekleyin"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              disabled={isSubmitting || hadEndDateInitially}
              rows={4}
            />

            <ModalPhotoUpload
              label="Fotoğraf (İsteğe Bağlı)"
              inputId="illness-photo"
              disabled={isSubmitting}
              previews={photoPreviews}
              onChange={handlePhotoChange}
              onRemove={handleRemovePhoto}
            />

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
                  {isSubmitting ? 'Kaydediliyor...' : submitLabel || (isEditMode ? 'Kaydet' : 'Ekle')}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

