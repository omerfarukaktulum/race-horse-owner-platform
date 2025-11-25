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
import { Activity } from 'lucide-react'
import { useModalInteractionGuard } from '@/app/hooks/use-modal-interaction-guard'

type OperationModalMode = 'create' | 'edit'

interface InitialOperationValues {
  date: string
  description?: string | null
  photoUrl?: string | string[] | null
}

interface AddIllnessOperationModalProps {
  open: boolean
  onClose: () => void
  illnessId: string
  horseName: string
  onSuccess?: () => void
  mode?: OperationModalMode
  operationId?: string
  initialOperation?: InitialOperationValues
  submitLabel?: string
}

export function AddIllnessOperationModal({
  open,
  onClose,
  illnessId,
  horseName,
  onSuccess,
  mode = 'create',
  operationId,
  initialOperation,
  submitLabel,
}: AddIllnessOperationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const { isGuarded, guardPointerEvent, guardFocusEvent } = useModalInteractionGuard(open)

  const isEditMode = mode === 'edit'

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

  // Initialize form when modal opens or initialOperation changes
  useEffect(() => {
    if (open) {
      if (isEditMode && initialOperation) {
        setDate(formatDateForInput(initialOperation.date))
        setDescription(initialOperation.description || '')
        
        // Handle photo previews
        if (initialOperation.photoUrl) {
          try {
            const photoUrls = typeof initialOperation.photoUrl === 'string' 
              ? JSON.parse(initialOperation.photoUrl) 
              : initialOperation.photoUrl
            if (Array.isArray(photoUrls)) {
              setPhotoPreviews(photoUrls)
            } else if (typeof photoUrls === 'string') {
              setPhotoPreviews([photoUrls])
            }
          } catch {
            if (typeof initialOperation.photoUrl === 'string') {
              setPhotoPreviews([initialOperation.photoUrl])
            }
          }
        } else {
          setPhotoPreviews([])
        }
        setPhotos([])
      } else {
        setDate(new Date().toISOString().split('T')[0])
        setDescription('')
        setPhotos([])
        setPhotoPreviews([])
      }
    }
  }, [open, isEditMode, initialOperation])

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
    const fileInput = document.getElementById('operation-photo') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!date) {
      toast.error('Lütfen tarih girin')
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('date', date)
      if (description.trim()) {
        formData.append('description', description.trim())
      }
      photos.forEach((photo) => {
        formData.append('photos', photo)
      })

      let response: Response
      if (isEditMode) {
        if (!operationId) {
          throw new Error('Müdahale bulunamadı')
        }
        response = await fetch(`/api/horse-illness-operations/${operationId}`, {
          method: 'PATCH',
          credentials: 'include',
          body: formData,
        })
      } else {
        response = await fetch(`/api/horse-illnesses/${illnessId}/operations`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'İşlem başarısız')
      }

      toast.success(isEditMode ? 'Müdahale başarıyla güncellendi' : 'Müdahale başarıyla eklendi')
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
      <DialogContent className="w-[320px] max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50 p-4">
        <DialogHeader className="text-center sm:text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <Activity className="h-8 w-8 text-white" />
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
              label="Tarih"
              required
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              disabled={isSubmitting}
              onMouseDown={guardPointerEvent}
              onTouchStart={guardPointerEvent}
              onFocus={guardFocusEvent}
              onClick={guardPointerEvent}
            />

            <ModalTextarea
              label="Açıklama"
              id="description"
              placeholder="Müdahale açıklaması ekleyin"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={4}
            />

            <ModalPhotoUpload
              label="Fotoğraf (İsteğe Bağlı)"
              inputId="operation-photo"
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

