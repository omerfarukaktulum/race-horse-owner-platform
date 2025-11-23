'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { Pill, X } from 'lucide-react'
import { BANNED_MEDICINES } from '@/lib/constants/banned-medicines'

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const medicineSelectRef = useRef<HTMLSelectElement>(null)
  const [modalJustOpened, setModalJustOpened] = useState(false)

  const isEditMode = mode === 'edit'

  // Prevent dropdowns from auto-opening on mobile when modal opens
  useEffect(() => {
    if (open) {
      setModalJustOpened(true)
      // Blur all select elements immediately to prevent auto-opening on mobile
      const blurSelects = () => {
        if (medicineSelectRef.current) {
          medicineSelectRef.current.blur()
        }
        // Also blur any other focused select elements
        const focusedElement = document.activeElement as HTMLElement
        if (focusedElement && focusedElement.tagName === 'SELECT') {
          focusedElement.blur()
        }
      }
      
      // Blur immediately
      blurSelects()
      
      // Blur after a short delay to catch any late focus
      const timer1 = setTimeout(blurSelects, 50)
      const timer2 = setTimeout(blurSelects, 150)
      const timer3 = setTimeout(() => setModalJustOpened(false), 300)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
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

    const newPhotos: File[] = []
    const newPreviews: string[] = []

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        newPhotos.push(file)
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          if (result) {
            newPreviews.push(result)
            setPhotoPreviews([...photoPreviews, ...newPreviews])
          }
        }
        reader.readAsDataURL(file)
      }
    })

    setPhotos((prev) => [...prev, ...newPhotos])
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
        <DialogHeader className="text-center space-y-4">
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="w-[240px] mx-auto space-y-5">
            {/* Medicine Name Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="medicineName" className="text-gray-700 font-medium">
                İlaç Adı <span className="text-red-500">*</span>
              </Label>
              <select
                ref={medicineSelectRef}
                id="medicineName"
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value)}
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
                <option value="">İlaç seçin...</option>
                {BANNED_MEDICINES.map((med) => (
                  <option key={med} value={med}>
                    {med}
                  </option>
                ))}
              </select>
            </div>

            {/* Given Date */}
            <div className="space-y-2">
              <Label htmlFor="givenDate" className="text-gray-700 font-medium">
                Verilme Tarihi <span className="text-red-500">*</span>
              </Label>
              <Input
                id="givenDate"
                type="date"
                value={givenDate}
                onChange={(e) => setGivenDate(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-11 w-full border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1] [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>

            {/* Wait Days */}
            <div className="space-y-2">
              <Label htmlFor="waitDays" className="text-gray-700 font-medium">
                Bekleme Süresi (Gün) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="waitDays"
                type="number"
                min="0"
                value={waitDays}
                onChange={(e) => setWaitDays(e.target.value)}
                placeholder="Örn: 7"
                required
                disabled={isSubmitting}
                className="h-11 w-full"
              />
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
                placeholder="İlaç hakkında notlar..."
                disabled={isSubmitting}
                className="flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50"
                rows={4}
              />
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                Fotoğraflar
              </Label>
              <div className="space-y-3">
              {/* Existing photos */}
              {existingPhotos.length > 0 && (
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
              )}

              {/* New photo previews */}
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add photo button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  Fotoğraf Ekle
                </Button>
              </div>
            </div>
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
              disabled={isSubmitting || !medicineName || !givenDate || !waitDays}
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

