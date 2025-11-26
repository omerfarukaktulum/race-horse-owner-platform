'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import {
  ModalDateField,
  ModalInput,
  ModalTextarea,
  ModalPhotoUpload,
} from '@/app/components/ui/modal-field'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { Pill, X, Hourglass } from 'lucide-react'
import { useModalInteractionGuard } from '@/app/hooks/use-modal-interaction-guard'

type MedicineModalMode = 'create' | 'edit'

interface InitialMedicineValues {
  medicineName: string
  givenDate: string
  waitDays: number
  note?: string
  photoUrl?: string | string[] | null
}

interface AddBannedMedicineModalProps {
  open: boolean
  onClose: () => void
  horseId: string
  horseName: string
  onSuccess?: () => void
  mode?: MedicineModalMode
  medicineId?: string
  initialMedicine?: InitialMedicineValues
}

export function AddBannedMedicineModal({
  open,
  onClose,
  horseId,
  horseName,
  onSuccess,
  mode = 'create',
  medicineId,
  initialMedicine,
}: AddBannedMedicineModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [medicineName, setMedicineName] = useState('')
  const [givenDate, setGivenDate] = useState(new Date().toISOString().split('T')[0])
  const [waitDays, setWaitDays] = useState<string>('')
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])
  const { guardPointerEvent, guardFocusEvent } = useModalInteractionGuard(open)

  const isEditMode = mode === 'edit'

  // Initialize form with existing data
  useEffect(() => {
    if (open) {
      if (isEditMode && initialMedicine) {
        setMedicineName(initialMedicine.medicineName || '')
        setGivenDate(initialMedicine.givenDate ? new Date(initialMedicine.givenDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
        setWaitDays(initialMedicine.waitDays ? initialMedicine.waitDays.toString() : '')
        setNote(initialMedicine.note || '')
        
        // Parse existing photos
        let existing: string[] = []
        if (initialMedicine.photoUrl) {
          try {
            if (Array.isArray(initialMedicine.photoUrl)) {
              existing = initialMedicine.photoUrl
            } else {
              const parsed = JSON.parse(initialMedicine.photoUrl)
              if (Array.isArray(parsed)) {
                existing = parsed
              } else {
                existing = [initialMedicine.photoUrl]
              }
            }
          } catch {
            existing = [initialMedicine.photoUrl as string]
          }
        }
        setExistingPhotos(existing)
        setPhotoPreviews([])
        setPhotos([])
      } else {
        // Reset form for create mode
        setMedicineName('')
        setGivenDate(new Date().toISOString().split('T')[0])
        setWaitDays('')
        setNote('')
        setExistingPhotos([])
        setPhotoPreviews([])
        setPhotos([])
      }
    }
  }, [open, isEditMode, initialMedicine])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles: File[] = []
    const previewPromises = files.map(
      (file) =>
        new Promise<string | null>((resolve) => {
          if (!file.type.startsWith('image/')) {
            resolve(null)
            return
          }
          validFiles.push(file)
        const reader = new FileReader()
          reader.onload = (event) => resolve((event.target?.result as string) || null)
          reader.onerror = () => resolve(null)
        reader.readAsDataURL(file)
    })
    )

    Promise.all(previewPromises).then((results) => {
      const filteredPreviews = results.filter((result): result is string => !!result)
      if (validFiles.length > 0 && filteredPreviews.length > 0) {
        setPhotos((prev) => [...prev, ...validFiles])
        setPhotoPreviews((prev) => [...prev, ...filteredPreviews])
      }
    })

    if (e.target) {
      e.target.value = ''
    }
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!medicineName || !givenDate || !waitDays) {
      toast.error('Lütfen tüm zorunlu alanları doldurun')
      return
    }

    const waitDaysNum = parseInt(waitDays, 10)
    if (isNaN(waitDaysNum) || waitDaysNum < 0) {
      toast.error('Bekleme süresi geçerli bir sayı olmalıdır')
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('medicineName', medicineName)
      formData.append('givenDate', givenDate)
      formData.append('waitDays', waitDaysNum.toString())
      if (note.trim()) {
        formData.append('note', note.trim())
      }
      
      // Send existing photos that weren't removed
      existingPhotos.forEach((photo) => {
        formData.append('existingPhotos', photo)
      })
      
      // Send new photos
      photos.forEach((photo) => {
        formData.append('photos', photo)
      })

      const url = isEditMode && medicineId
        ? `/api/horses/${horseId}/banned-medicines/${medicineId}`
        : `/api/horses/${horseId}/banned-medicines`

      const response = await fetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'İlaç kaydı kaydedilemedi')
      }

      toast.success(isEditMode ? 'İlaç kaydı güncellendi' : 'İlaç kaydı eklendi')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error saving banned medicine:', error)
      toast.error(error.message || 'Bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const allPhotos = [...existingPhotos, ...photoPreviews]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[320px] max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50 p-4">
        <DialogHeader className="text-center sm:text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <Pill className="h-8 w-8 text-white" />
            </div>
          </div>
          {horseName && (
            <div className="w-[240px] mx-auto">
              <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                {horseName}
              </DialogTitle>
            </div>
          )}
          <p className="text-sm text-gray-600">
            {isEditMode ? 'İlaç Kaydını Düzenle' : ''}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="w-[260px] mx-auto space-y-5">
            <ModalInput
              label="İlaç Adı"
              required
              id="medicineName"
              type="text"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              placeholder="İlaç adını girin..."
              disabled={isSubmitting}
              startIcon={<Pill className="h-4 w-4" />}
            />

            <ModalDateField
              label="Verilme Tarihi"
              required
                id="givenDate"
                value={givenDate}
                onChange={(e) => setGivenDate(e.target.value)}
                disabled={isSubmitting}
              onMouseDown={guardPointerEvent}
              onTouchStart={guardPointerEvent}
              onFocus={guardFocusEvent}
              onClick={guardPointerEvent}
            />

            <ModalInput
              label="Bekleme Süresi (Gün)"
              required
                id="waitDays"
                type="number"
                min="0"
                value={waitDays}
                onChange={(e) => setWaitDays(e.target.value)}
                placeholder="Örn: 7"
                disabled={isSubmitting}
              startIcon={<Hourglass className="h-4 w-4" />}
            />

            <ModalTextarea
              label="Not"
              id="medicine-note"
              placeholder="İlaç hakkında notlar..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
                rows={4}
              />

            {existingPhotos.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Yüklenmiş Fotoğraflar</p>
                <div className="grid grid-cols-2 gap-2">
                  {existingPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Existing ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                </div>
              )}

            <ModalPhotoUpload
              label="Yeni Fotoğraf Ekle"
              inputId="medicine-photo"
              disabled={isSubmitting}
              previews={photoPreviews}
                  onChange={handlePhotoChange}
              onRemove={removePhoto}
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
              disabled={isSubmitting || !medicineName || !givenDate || !waitDays}
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

