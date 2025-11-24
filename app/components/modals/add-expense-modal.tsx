'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import {
  ModalSelect,
  ModalDateField,
  ModalInput,
  ModalTextarea,
  ModalPhotoUpload,
} from '@/app/components/ui/modal-field'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'
import { EXPENSE_CATEGORIES, HORSE_REQUIRED_CATEGORIES } from '@/lib/constants/expense-categories'
import { TurkishLira, Users, UserRound, Wallet, ListChecks } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'
import { useModalInteractionGuard } from '@/app/hooks/use-modal-interaction-guard'

interface Horse {
  id: string
  name: string
  status: string
  stablemate?: {
    id: string
    name: string
  } | null
}

type AddExpenseMode = 'create' | 'edit'

interface InitialExpenseValues {
  date: string
  category: string
  amount: number | string
  currency?: string
  note?: string | null
  customName?: string | null
  photoUrl?: string | string[] | null
}

interface AddExpenseModalProps {
  open: boolean
  onClose: () => void
  preselectedHorseId?: string
  preselectedHorseName?: string
  onSuccess?: () => void
  mode?: AddExpenseMode
  expenseId?: string
  initialExpense?: InitialExpenseValues
  submitLabel?: string
}

export function AddExpenseModal({
  open,
  onClose,
  preselectedHorseId,
  preselectedHorseName,
  onSuccess,
  mode = 'create',
  expenseId,
  initialExpense,
  submitLabel,
}: AddExpenseModalProps) {
  const { user } = useAuth()
  const [horses, setHorses] = useState<Horse[]>([])
  const [isLoadingHorses, setIsLoadingHorses] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSingleHorseMode = !!preselectedHorseId && !!preselectedHorseName
  const isEditMode = mode === 'edit'
  const [selectedHorseId, setSelectedHorseId] = useState('')
  const [stablemates, setStablemates] = useState<Array<{ id: string; name: string }>>([])
  const [selectedStablemateId, setSelectedStablemateId] = useState('')
  const [isLoadingStablemates, setIsLoadingStablemates] = useState(false)
  const { guardPointerEvent, guardFocusEvent } = useModalInteractionGuard(open)
  const isTrainer = user?.role === 'TRAINER'

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

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

  // Filter horses by selected stablemate
  const filteredHorses = isTrainer && selectedStablemateId
    ? horses.filter((h) => h.stablemate?.id === selectedStablemateId)
    : horses

  useEffect(() => {
    if (open) {
      if (isSingleHorseMode) {
        setHorses([{
          id: preselectedHorseId!,
          name: preselectedHorseName!,
          status: '',
        }])
        setIsLoadingHorses(false)
      } else {
        fetchHorses()
      }

      if (mode === 'edit' && initialExpense) {
        const formattedDate = initialExpense.date
          ? new Date(initialExpense.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
        setDate(formattedDate)
        setCategory(initialExpense.category || '')
        setAmount(initialExpense.amount?.toString() || '')
        setNotes(initialExpense.note || '')
        const initialPhotos =
          typeof initialExpense.photoUrl === 'string'
            ? (() => {
                const trimmed = initialExpense.photoUrl.trim()
                if (trimmed.startsWith('[')) {
                  try {
                    const parsed = JSON.parse(trimmed)
                    if (Array.isArray(parsed)) {
                      return parsed.filter(Boolean) as string[]
                    }
                  } catch {
                    // ignore parse error
                  }
                }
                return trimmed ? [trimmed] : []
              })()
            : Array.isArray(initialExpense.photoUrl)
              ? initialExpense.photoUrl.filter(Boolean)
              : []
        setPhotoPreviews(initialPhotos as string[])
        setPhotos([])
      } else {
      setDate(new Date().toISOString().split('T')[0])
      setCategory('')
      setAmount('')
      setNotes('')
      setPhotos([])
      setPhotoPreviews([])
      setSelectedHorseId('')
      setSelectedStablemateId('')
    }
    }
  }, [open, preselectedHorseId, preselectedHorseName, isSingleHorseMode, mode, initialExpense])

  // Reset horse selection when stablemate changes
  useEffect(() => {
    if (selectedStablemateId) {
      setSelectedHorseId('')
    }
  }, [selectedStablemateId])

  const fetchHorses = async () => {
    try {
      const response = await fetch('/api/horses', { credentials: 'include' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Atlar yüklenemedi')
      }

      setHorses(
        (data.horses || []).map((horse: any) => ({
          id: horse.id,
          name: horse.name,
          status: horse.status,
          stablemate: horse.stablemate ? { id: horse.stablemate.id, name: horse.stablemate.name } : null,
        }))
      )
    } catch (error) {
      console.error('Fetch horses error:', error)
      toast.error('Atlar yüklenirken bir hata oluştu')
    } finally {
      setIsLoadingHorses(false)
    }
  }

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
  const fileInput = document.getElementById('expense-photo') as HTMLInputElement
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

    // Check if horse is required for this category
    const requiresHorse = HORSE_REQUIRED_CATEGORIES.includes(category as any)
    if (requiresHorse && !isSingleHorseMode && !selectedHorseId) {
      toast.error('Lütfen bir at seçin')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Lütfen geçerli bir tutar girin')
      return
    }

    if (!date) {
      toast.error('Lütfen geçerli bir tarih seçin')
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditMode) {
        if (!expenseId) {
          throw new Error('Gider bulunamadı')
        }

        const formData = new FormData()
        formData.append('date', date)
        formData.append('category', category)
        formData.append('amount', amount)
        formData.append('currency', 'TRY')
        formData.append('notes', notes)
        photos.forEach((photo) => {
          formData.append('photos', photo)
        })

        const response = await fetch(`/api/expenses/${expenseId}`, {
          method: 'PATCH',
          credentials: 'include',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Gider güncellenemedi')
        }

        toast.success('Gider başarıyla kaydedildi')
        onSuccess?.()
        onClose()
      } else {
        const requiresHorse = HORSE_REQUIRED_CATEGORIES.includes(category as any)
        if (requiresHorse && !isSingleHorseMode && !selectedHorseId) {
          toast.error('Lütfen bir at seçin')
          setIsSubmitting(false)
          return
        }

      const formData = new FormData()
      const horseIds = isSingleHorseMode
        ? [preselectedHorseId]
        : (requiresHorse ? [selectedHorseId] : [])
      formData.append('horseIds', JSON.stringify(horseIds.filter(Boolean)))
      formData.append('date', date)
      formData.append('category', category)
      formData.append('amount', amount)
      formData.append('currency', 'TRY')
      formData.append('notes', notes)
      photos.forEach((photo) => {
        formData.append('photos', photo)
      })

      const response = await fetch('/api/expenses', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Gider eklenemedi')
      }

      toast.success('Gider başarıyla eklendi')
      onSuccess?.()
      onClose()
      }
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
              <TurkishLira className="h-8 w-8 text-white" />
            </div>
          </div>
          {isSingleHorseMode && preselectedHorseName && (
            <div className="w-[240px] mx-auto">
              <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                {preselectedHorseName}
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

            <ModalSelect
              label={TR.expenses.category}
              required
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                // Reset horse selection when category changes
                if (!isSingleHorseMode) {
                  setSelectedHorseId('')
                }
              }}
              disabled={isSubmitting}
              onMouseDown={guardPointerEvent}
              onTouchStart={guardPointerEvent}
              onFocus={guardFocusEvent}
              icon={<ListChecks className="h-4 w-4" />}
            >
              <option value="">Kategori seçin</option>
              {(isSingleHorseMode
                ? EXPENSE_CATEGORIES.filter((cat) => HORSE_REQUIRED_CATEGORIES.includes(cat.value as any))
                : EXPENSE_CATEGORIES
              ).map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </ModalSelect>

            {!isSingleHorseMode && category && HORSE_REQUIRED_CATEGORIES.includes(category as any) && (
              <>
                {isLoadingHorses ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center text-sm text-gray-500">
                    {TR.common.loading}
                  </div>
                ) : filteredHorses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center text-sm text-gray-500">
                    <p>{isTrainer && !selectedStablemateId ? 'Önce eküri seçin' : 'Henüz atınız bulunmuyor.'}</p>
                    {!isTrainer && <p className="mt-2 text-xs text-gray-400">Önce at eklemeniz gerekiyor.</p>}
                  </div>
                ) : (
                  <ModalSelect
                    label={TR.expenses.selectHorses}
                    required
                    value={selectedHorseId}
                    onChange={(e) => setSelectedHorseId(e.target.value)}
                    disabled={isSubmitting || (isTrainer && !selectedStablemateId)}
                    onMouseDown={guardPointerEvent}
                    onTouchStart={guardPointerEvent}
                    onFocus={guardFocusEvent}
                    icon={<UserRound className="h-4 w-4" />}
                  >
                    <option value="">
                      {isTrainer && !selectedStablemateId ? 'Önce eküri seçin' : 'At seçin'}
                    </option>
                    {filteredHorses.map((horse) => (
                      <option key={horse.id} value={horse.id}>
                        {horse.name}
                      </option>
                    ))}
                  </ModalSelect>
                )}
              </>
            )}

            <ModalDateField
              label={TR.expenses.date}
              required
              id="expense-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              disabled={isSubmitting}
              onMouseDown={guardPointerEvent}
              onTouchStart={guardPointerEvent}
              onFocus={guardFocusEvent}
              onClick={guardPointerEvent}
            />


            <ModalInput
              label={`${TR.expenses.amount} (₺)`}
              required
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
              startIcon={<Wallet className="h-4 w-4" />}
            />

            <ModalTextarea
              label="Not"
              required
              id="notes"
              placeholder="Not Ekleyin"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />

            <ModalPhotoUpload
              label={TR.expenses.photo}
              inputId="expense-photo"
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
                  {TR.common.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isSubmitting ? TR.common.loading : submitLabel || (isEditMode ? 'Kaydet' : TR.expenses.addExpense)}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

