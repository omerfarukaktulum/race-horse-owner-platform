'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/app/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Label } from '@/app/components/ui/label'
import { toast } from 'sonner'
import { FileText, X } from 'lucide-react'
import { formatDateShort } from '@/lib/utils/format'

interface AddGallopNoteModalProps {
  open: boolean
  onClose: () => void
  gallopId: string
  gallopDate: string
  initialNote?: string | null
  initialPhotoUrl?: string | string[] | null
  onSuccess?: () => void
}

export function AddGallopNoteModal({
  open,
  onClose,
  gallopId,
  gallopDate,
  initialNote,
  initialPhotoUrl,
  onSuccess,
}: AddGallopNoteModalProps) {
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEditMode = !!initialNote || !!initialPhotoUrl

  // Initialize form with existing data
  useEffect(() => {
    if (open) {
      if (initialNote) {
        setNote(initialNote)
      } else {
        setNote('')
      }

      // Parse existing photos
      let existing: string[] = []
      if (initialPhotoUrl) {
        try {
          if (Array.isArray(initialPhotoUrl)) {
            existing = initialPhotoUrl
          } else {
            const parsed = JSON.parse(initialPhotoUrl)
            if (Array.isArray(parsed)) {
              existing = parsed
            } else {
              existing = [initialPhotoUrl]
            }
          }
        } catch {
          existing = [initialPhotoUrl as string]
        }
      }
      setExistingPhotos(existing)
      setPhotoPreviews([])
      setPhotos([])
    }
  }, [open, initialNote, initialPhotoUrl])

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

    if (!note.trim() && photos.length === 0 && existingPhotos.length === 0) {
      toast.error('Lütfen bir not veya fotoğraf ekleyin')
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      if (note.trim()) {
        formData.append('note', note.trim())
      }
      
      // Send existing photos that weren't removed
      existingPhotos.forEach((photo) => {
        // Send as base64 data URL
        formData.append('existingPhotos', photo)
      })
      
      // Send new photos
      photos.forEach((photo) => {
        formData.append('photos', photo)
      })

      const response = await fetch(`/api/gallops/${gallopId}/note`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'İdman notu güncellenemedi')
      }

      toast.success(isEditMode ? 'İdman notu güncellendi' : 'İdman notu eklendi')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error saving gallop note:', error)
      toast.error(error.message || 'Bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('İdman notunu silmek istediğinize emin misiniz?')) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/gallops/${gallopId}/note`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'İdman notu silinemedi')
      }

      toast.success('İdman notu silindi')
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error deleting gallop note:', error)
      toast.error(error.message || 'Bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const allPhotos = [...existingPhotos, ...photoPreviews]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[320px] max-h-[90vh] p-0 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                {isEditMode ? 'İdman Notunu Düzenle' : 'İdman Notu Ekle'}
              </DialogTitle>
              <div className="text-sm text-gray-600 mt-2">
                <p>
                  <span className="font-semibold">Tarih:</span> {formatDateShort(gallopDate)}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="note" className="text-sm font-medium text-gray-700">
                İdman Notu
              </Label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="İdman hakkında notlarınızı buraya yazın..."
                className="mt-1 w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={5}
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">
                Fotoğraflar
              </Label>
              <div className="mt-2 space-y-3">
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

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            {isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Sil
              </Button>
            )}
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
              disabled={isSubmitting || (!note.trim() && allPhotos.length === 0)}
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

