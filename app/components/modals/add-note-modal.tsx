'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import {
  ModalSelect,
  ModalTextarea,
  ModalDateField,
  ModalPhotoUpload,
  ModalInput,
} from '@/app/components/ui/modal-field'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { FileText, Users, UserRound, Scale } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'
import { useModalInteractionGuard } from '@/app/hooks/use-modal-interaction-guard'

type NoteModalMode = 'create' | 'edit'

interface InitialNoteValues {
  date: string
  note: string
  photoUrl?: string | string[] | null
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
  const [kiloValue, setKiloValue] = useState<string>('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [selectedHorseId, setSelectedHorseId] = useState(horseId || '')
  const [selectedHorseName, setSelectedHorseName] = useState(horseName || '')
  const [stablemates, setStablemates] = useState<Array<{ id: string; name: string }>>([])
  const [selectedStablemateId, setSelectedStablemateId] = useState('')
  const [allHorses, setAllHorses] = useState<
    Array<{ id: string; name: string; stablemate?: { id: string; name: string } | null }>
  >([])
  const [isLoadingStablemates, setIsLoadingStablemates] = useState(false)
  const { isGuarded, guardPointerEvent, guardFocusEvent } = useModalInteractionGuard(open)

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
        setKiloValue(
          initialNote.kiloValue !== null && initialNote.kiloValue !== undefined
            ? initialNote.kiloValue.toString()
            : ''
        )
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
      setPhotos([])
      setKiloValue('')
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
    const fileInput = document.getElementById('note-photo') as HTMLInputElement
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

    let kiloValueNum: number | null = null
    if (kiloValue.trim()) {
      const parsed = parseFloat(kiloValue.trim())
      if (isNaN(parsed) || parsed <= 0) {
        toast.error('Lütfen geçerli bir kilo değeri girin')
        return
      }
      kiloValueNum = parsed
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
        <DialogHeader className="text-center sm:text-center space-y-4">
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
        <form onSubmit={handleSubmit}>
          <div className="w-[260px] mx-auto space-y-5">
            {!isSingleHorseMode && isTrainer && (
              <ModalSelect
                label="Eküri Seçin"
                required
                value={selectedStablemateId}
                onChange={(e) => setSelectedStablemateId(e.target.value)}
                disabled={isSubmitting || isLoadingStablemates}
                onMouseDown={guardPointerEvent}
                onTouchStart={guardPointerEvent}
                onFocus={guardFocusEvent}
                icon={<Users className="h-4 w-4" />}
              >
                <option value="">Eküri seçin</option>
                {stablemates.map((stablemate) => (
                  <option key={stablemate.id} value={stablemate.id}>
                    {stablemate.name}
                  </option>
                ))}
              </ModalSelect>
            )}

            {!isSingleHorseMode && (
              <ModalSelect
                label="At Seçin"
                required
                value={selectedHorseId}
                onChange={(e) => {
                    const horse = filteredHorses.find((h) => h.id === e.target.value)
                    setSelectedHorseId(e.target.value)
                    setSelectedHorseName(horse?.name || '')
                }}
                disabled={isSubmitting || (isTrainer && !selectedStablemateId)}
                onMouseDown={guardPointerEvent}
                onTouchStart={guardPointerEvent}
                onFocus={guardFocusEvent}
                icon={<UserRound className="h-4 w-4" />}
              >
                <option value="">{isTrainer && !selectedStablemateId ? 'Önce eküri seçin' : 'At seçin'}</option>
                {filteredHorses.map((horseOption) => (
                  <option key={horseOption.id} value={horseOption.id}>
                    {horseOption.name}
                  </option>
                ))}
              </ModalSelect>
            )}

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
              label="Not"
              required
              id="note"
              placeholder="Not Ekleyin"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
              rows={4}
            />

            <ModalInput
              label="Kilo (yem miktarı, atın kilosu)"
              id="kiloValue"
              type="number"
              step="0.1"
              min="0"
              value={kiloValue}
              onChange={(e) => setKiloValue(e.target.value)}
              disabled={isSubmitting}
              placeholder="Örn: 12.5"
              startIcon={<Scale className="h-4 w-4" />}
              helperText="İsterseniz kilo bilgisini ekleyebilirsiniz."
            />

            <ModalPhotoUpload
              label="Fotoğraf (İsteğe Bağlı)"
              inputId="note-photo"
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
                  {isSubmitting ? 'Kaydediliyor...' : submitLabel || (isEditMode ? 'Kaydet' : 'Not Ekle')}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

