'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { FileText } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'

type NoteModalMode = 'create' | 'edit'

type NoteCategory = 'Yem Takibi' | 'Gezinti' | 'Hastalık' | 'Gelişim' | 'Kilo Takibi'
const NOTE_CATEGORIES: NoteCategory[] = ['Yem Takibi', 'Gezinti', 'Hastalık', 'Gelişim', 'Kilo Takibi']

interface InitialNoteValues {
  date: string
  note: string
  photoUrl?: string | string[] | null
  category?: NoteCategory
  kiloValue?: number | null
}

interface AddNoteModalProps {
  open: boolean
  onClose: () => void
  horseId?: string
  horseName?: string
  horses?: Array<{ id: string; name: string; stablemate?: { id: string; name: string } | null }>
  onSuccess?: () => void
  mode?: NoteModalMode
  noteId?: string
  initialNote?: InitialNoteValues
  submitLabel?: string
}

export function AddNoteModal({
  open,
  onClose,
  horseId,
  horseName,
  horses = [],
  onSuccess,
  mode = 'create',
  noteId,
  initialNote,
  submitLabel,
}: AddNoteModalProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [category, setCategory] = useState<NoteCategory | ''>('')
  const [kiloValue, setKiloValue] = useState<string>('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [selectedHorseId, setSelectedHorseId] = useState(horseId || '')
  const [selectedHorseName, setSelectedHorseName] = useState(horseName || '')
  const [stablemates, setStablemates] = useState<Array<{ id: string; name: string }>>([])
  const [selectedStablemateId, setSelectedStablemateId] = useState('')
  const [allHorses, setAllHorses] = useState<Array<{ id: string; name: string; stablemate?: { id: string; name: string } | null }>>([])
  const [isLoadingStablemates, setIsLoadingStablemates] = useState(false)
  const stablemateSelectRef = useRef<HTMLSelectElement>(null)

  const isEditMode = mode === 'edit'
  const isSingleHorseMode = !!horseId && !!horseName
  const isTrainer = user?.role === 'TRAINER'

  // Fetch stablemates for trainers
  useEffect(() => {
    if (open && isTrainer && !isSingleHorseMode && !isEditMode) {
      setIsLoadingStablemates(true)
      fetch('/api/trainer/account', { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.stablemates) {
            setStablemates(
              data.stablemates.map((sm: any) => ({
                id: sm.id,
                name: sm.name,
              }))
            )
          }
        })
        .catch((err) => {
          console.error('Failed to fetch stablemates:', err)
        })
        .finally(() => {
          setIsLoadingStablemates(false)
        })
    }
  }, [open, isTrainer, isSingleHorseMode, isEditMode])

  // Fetch horses with stablemate info for trainers
  useEffect(() => {
    if (open && isTrainer && !isSingleHorseMode && !isEditMode) {
      fetch('/api/horses', { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.horses) {
            setAllHorses(
              data.horses.map((h: any) => ({
                id: h.id,
                name: h.name,
                stablemate: h.stablemate ? { id: h.stablemate.id, name: h.stablemate.name } : null,
              }))
            )
          }
        })
        .catch((err) => {
          console.error('Failed to fetch horses:', err)
        })
    } else if (!isTrainer && horses.length > 0) {
      setAllHorses(horses)
    }
  }, [open, isTrainer, isSingleHorseMode, isEditMode, horses])

  // Filter horses by selected stablemate
  const filteredHorses = isTrainer && selectedStablemateId
    ? allHorses.filter((h) => h.stablemate?.id === selectedStablemateId)
    : allHorses

  useEffect(() => {
    if (open) {
      if (isEditMode && initialNote) {
        const formattedDate = initialNote.date
          ? new Date(initialNote.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
        setDate(formattedDate)
        setNote(initialNote.note || '')
        setCategory(initialNote.category || '')
        setKiloValue(initialNote.kiloValue ? initialNote.kiloValue.toString() : '')
        const initialPhotos =
          typeof initialNote.photoUrl === 'string'
            ? (() => {
                try {
                  const parsed = JSON.parse(initialNote.photoUrl)
                  if (Array.isArray(parsed)) {
                    return parsed as string[]
                  }
                } catch {
                  // ignore
                }
                return initialNote.photoUrl ? [initialNote.photoUrl] : []
              })()
            : Array.isArray(initialNote.photoUrl)
              ? initialNote.photoUrl
              : []
        setPhotoPreviews(initialPhotos as string[])
        setPhotos([])
      } else {
      setDate(new Date().toISOString().split('T')[0])
      setNote('')
      setCategory('')
      setPhotos([])
      setPhotoPreviews([])
      setSelectedStablemateId('')
      if (!isSingleHorseMode) {
        setSelectedHorseId('')
        setSelectedHorseName('')
      } else {
        setSelectedHorseId(horseId || '')
        setSelectedHorseName(horseName || '')
      }
    }
    }
  }, [open, isEditMode, initialNote, isSingleHorseMode, horseId, horseName])

  // Reset horse selection when stablemate changes
  useEffect(() => {
    if (selectedStablemateId) {
      setSelectedHorseId('')
      setSelectedHorseName('')
    }
  }, [selectedStablemateId])

  // Focus eküri dropdown when modal opens (for trainers)
  useEffect(() => {
    if (open && isTrainer && !isSingleHorseMode && !isEditMode) {
      // Focus immediately when modal opens
      const timer = setTimeout(() => {
        if (stablemateSelectRef.current) {
          stablemateSelectRef.current.focus()
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open, isTrainer, isSingleHorseMode, isEditMode])

  // Focus eküri dropdown when it becomes enabled (after stablemates load)
  useEffect(() => {
    if (open && isTrainer && !isSingleHorseMode && !isEditMode && !isLoadingStablemates && stablemates.length > 0) {
      // Focus when stablemates are loaded and dropdown is enabled
      const timer = setTimeout(() => {
        if (stablemateSelectRef.current) {
          stablemateSelectRef.current.focus()
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open, isTrainer, isSingleHorseMode, isEditMode, isLoadingStablemates, stablemates.length])

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

    if (!category) {
      toast.error('Lütfen bir kategori seçin')
      return
    }

    if (!note.trim()) {
      toast.error('Lütfen bir not girin')
      return
    }

    // Validate kiloValue for Kilo Takibi or Yem Takibi
    if ((category === 'Kilo Takibi' || category === 'Yem Takibi') && !kiloValue.trim()) {
      toast.error('Lütfen kilo değeri girin')
      return
    }

    const kiloValueNum = (category === 'Kilo Takibi' || category === 'Yem Takibi') && kiloValue.trim()
      ? parseFloat(kiloValue.trim())
      : null

    if ((category === 'Kilo Takibi' || category === 'Yem Takibi') && (isNaN(kiloValueNum!) || kiloValueNum! <= 0)) {
      toast.error('Lütfen geçerli bir kilo değeri girin')
      return
    }

    setIsSubmitting(true)

    try {
      const targetHorseId = isSingleHorseMode ? horseId : selectedHorseId
      if (!targetHorseId) {
        toast.error('Lütfen bir at seçin')
        setIsSubmitting(false)
        return
      }

      const formData = new FormData()
      formData.append('date', date)
      formData.append('note', note.trim())
      formData.append('category', category)
      if (kiloValueNum !== null) {
        formData.append('kiloValue', kiloValueNum.toString())
      }
      photos.forEach((photo) => {
        formData.append('photos', photo)
      })

      let response: Response
      if (isEditMode) {
        if (!noteId) {
          throw new Error('Not bulunamadı')
        }
        response = await fetch(`/api/horse-notes/${noteId}`, {
          method: 'PATCH',
          credentials: 'include',
          body: formData,
        })
      } else {
        response = await fetch(`/api/horses/${targetHorseId}/notes`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'İşlem başarısız')
      }

      toast.success(isEditMode ? 'Not başarıyla güncellendi' : 'Not başarıyla eklendi')
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
          {(isSingleHorseMode ? horseName : selectedHorseName) && (
            <div className="w-[240px] mx-auto">
              <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                {isSingleHorseMode ? horseName : selectedHorseName}
              </DialogTitle>
            </div>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="w-[240px] mx-auto space-y-5">
            {/* Stablemate Selection (for trainers) */}
            {!isSingleHorseMode && isTrainer && (
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Eküri Seçin *</Label>
                <select
                  ref={stablemateSelectRef}
                  value={selectedStablemateId}
                  onChange={(e) => setSelectedStablemateId(e.target.value)}
                  required
                  disabled={isSubmitting || isLoadingStablemates}
                  className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Eküri seçin</option>
                  {stablemates.map((stablemate) => (
                    <option key={stablemate.id} value={stablemate.id}>
                      {stablemate.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Horse Selection */}
            {!isSingleHorseMode && (
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">At Seçin *</Label>
                <select
                  value={selectedHorseId}
                  onChange={(e) => {
                    const horse = filteredHorses.find((h) => h.id === e.target.value)
                    setSelectedHorseId(e.target.value)
                    setSelectedHorseName(horse?.name || '')
                  }}
                  required
                  disabled={isSubmitting || (isTrainer && !selectedStablemateId)}
                  className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{isTrainer && !selectedStablemateId ? 'Önce eküri seçin' : 'At seçin'}</option>
                  {filteredHorses.map((horseOption) => (
                    <option key={horseOption.id} value={horseOption.id}>
                      {horseOption.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Kategori *</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NoteCategory | '')}
                disabled={isSubmitting}
                required
                tabIndex={isTrainer && !isSingleHorseMode ? -1 : 0}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Kategori seçin</option>
                {NOTE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Kilo Value - shown only for Kilo Takibi or Yem Takibi */}
            {(category === 'Kilo Takibi' || category === 'Yem Takibi') && (
              <div className="space-y-2">
                <Label htmlFor="kiloValue" className="text-gray-700 font-medium">Kaç Kilo? *</Label>
                <Input
                  id="kiloValue"
                  type="number"
                  step="0.1"
                  min="0"
                  value={kiloValue}
                  onChange={(e) => setKiloValue(e.target.value)}
                  required
                  disabled={isSubmitting}
                  placeholder="Örn: 12.5"
                  tabIndex={isTrainer && !isSingleHorseMode ? -1 : 0}
                  className="h-11 w-full border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
                />
              </div>
            )}

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
                tabIndex={isTrainer && !isSingleHorseMode ? -1 : 0}
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
                tabIndex={isTrainer && !isSingleHorseMode ? -1 : 0}
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
                  {isSubmitting
                    ? 'Kaydediliyor...'
                    : submitLabel || (isEditMode ? 'Kaydet' : 'Not Ekle')}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

