'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { FileText } from 'lucide-react'

interface AddNoteModalProps {
  open: boolean
  onClose: () => void
  horseId: string
  horseName: string
  onSuccess?: () => void
}

export function AddNoteModal({ open, onClose, horseId, horseName, onSuccess }: AddNoteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      // Reset form
      setDate(new Date().toISOString().split('T')[0])
      setNote('')
      setPhotos([])
      setPhotoPreviews([])
    }
  }, [open])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles: File[] = []
    const newPreviews: string[] = []

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} boyutu 5MB'dan küçük olmalıdır`)
        return
      }
      validFiles.push(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result as string)
        if (newPreviews.length === validFiles.length) {
          setPhotos([...photos, ...validFiles])
          setPhotoPreviews([...photoPreviews, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    const newPreviews = photoPreviews.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    setPhotoPreviews(newPreviews)
    // Reset the file input
    const fileInput = document.getElementById('photo') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!note.trim()) {
      toast.error('Lütfen bir not girin')
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('date', date)
      formData.append('note', note.trim())
      photos.forEach((photo) => {
        formData.append('photos', photo)
      })

      const response = await fetch(`/api/horses/${horseId}/notes`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Not eklenemedi')
      }

      toast.success('Not başarıyla eklendi')
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
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
          </div>
          {horseName && (
            <div className="w-[240px] mx-auto">
              <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                {horseName}
              </DialogTitle>
            </div>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="w-[240px] mx-auto space-y-5">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-gray-700 font-medium">Tarih *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                disabled={isSubmitting}
                className="h-11 w-full border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1] [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                style={{ width: '100%', maxWidth: '240px' }}
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note" className="text-gray-700 font-medium">Not *</Label>
              <textarea
                id="note"
                placeholder="Not Ekleyin"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                disabled={isSubmitting}
                rows={4}
                className="flex w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:border-[#6366f1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label htmlFor="photo" className="text-gray-700 font-medium">Fotoğraf (İsteğe Bağlı)</Label>
              <div className="relative">
                <label htmlFor="photo" className="cursor-pointer">
                  <div className="flex items-center justify-center h-11 w-full border-2 border-dashed border-gray-300 rounded-md hover:border-[#6366f1] transition-colors bg-gray-50 hover:bg-gray-100">
                    <span className="text-sm text-gray-600 font-medium">Dosya Seç</span>
                  </div>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    disabled={isSubmitting}
                    className="hidden"
                  />
                </label>
              </div>
              {photoPreviews.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-300">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg transition-colors"
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                  {isSubmitting ? 'Kaydediliyor...' : 'Not Ekle'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

