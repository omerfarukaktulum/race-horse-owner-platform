'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { TurkishDateInput } from '@/app/components/ui/turkish-date-input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'
import { EXPENSE_CATEGORIES } from '@/lib/constants/expense-categories'
import { TurkishLira, ChevronDown } from 'lucide-react'
import { useAuth } from '@/lib/context/auth-context'

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
  const stablemateSelectRef = useRef<HTMLSelectElement>(null)
  const horseSelectRef = useRef<HTMLSelectElement>(null)
  const categorySelectRef = useRef<HTMLSelectElement>(null)
  const [modalJustOpened, setModalJustOpened] = useState(false)
  const isTrainer = user?.role === 'TRAINER'

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
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

  // Prevent dropdowns from auto-opening on mobile when modal opens
  useEffect(() => {
    if (open) {
      setModalJustOpened(true)
      // Blur all select elements immediately to prevent auto-opening on mobile
      const blurSelects = () => {
        if (stablemateSelectRef.current) {
          stablemateSelectRef.current.blur()
        }
        if (horseSelectRef.current) {
          horseSelectRef.current.blur()
        }
        if (categorySelectRef.current) {
          categorySelectRef.current.blur()
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
        setCustomCategory(initialExpense.customName || '')
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
      setCustomCategory('')
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

    if (category === 'OZEL' && !customCategory) {
      toast.error('Lütfen özel kategori adı girin')
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
        if (category === 'OZEL' && customCategory) {
          formData.append('customName', customCategory)
        }
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
        if (!isSingleHorseMode && !selectedHorseId) {
          toast.error('Lütfen bir at seçin')
          setIsSubmitting(false)
          return
        }

      const formData = new FormData()
      const horseIds = isSingleHorseMode
        ? [preselectedHorseId]
        : [selectedHorseId]
      formData.append('horseIds', JSON.stringify(horseIds.filter(Boolean)))
      formData.append('date', date)
      formData.append('category', category)
      if (category === 'OZEL' && customCategory) {
        formData.append('customName', customCategory)
      }
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
        <DialogHeader className="text-center space-y-4">
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
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="w-[240px] max-w-[240px] mx-auto space-y-5 overflow-hidden">
            {/* Stablemate Selection (for trainers) */}
            {!isSingleHorseMode && isTrainer && (
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Eküri Seçin *</Label>
                <div className="relative">
                <select
                  ref={stablemateSelectRef}
                  value={selectedStablemateId}
                  onChange={(e) => setSelectedStablemateId(e.target.value)}
                    onMouseDown={handleSelectMouseDown}
                    onTouchStart={handleSelectTouchStart}
                  required
                  disabled={isSubmitting || isLoadingStablemates}
                    className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer md:cursor-default"
                >
                  <option value="">Eküri seçin</option>
                  {stablemates.map((stablemate) => (
                    <option key={stablemate.id} value={stablemate.id}>
                      {stablemate.name}
                    </option>
                  ))}
                </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none md:hidden" />
                </div>
              </div>
            )}

            {/* Horse Selection */}
            {!isSingleHorseMode && (
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  {TR.expenses.selectHorses}
                </Label>
                {isLoadingHorses ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>{TR.common.loading}</p>
                  </div>
                ) : filteredHorses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border rounded-lg">
                    <p>{isTrainer && !selectedStablemateId ? 'Önce eküri seçin' : 'Henüz atınız bulunmuyor.'}</p>
                    {!isTrainer && <p className="text-sm mt-2">Önce at eklemeniz gerekiyor.</p>}
                  </div>
                ) : (
                  <div className="relative">
                  <select
                      ref={horseSelectRef}
                    value={selectedHorseId}
                    onChange={(e) => setSelectedHorseId(e.target.value)}
                      onMouseDown={handleSelectMouseDown}
                      onTouchStart={handleSelectTouchStart}
                    required
                    disabled={isSubmitting || (isTrainer && !selectedStablemateId)}
                      className="flex h-11 w-full rounded-md border border-gray-300 bg-background px-3 py-2 pr-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:border-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer md:cursor-default"
                  >
                    <option value="">
                      {isTrainer && !selectedStablemateId ? 'Önce eküri seçin' : 'At seçin'}
                    </option>
                    {filteredHorses.map((horse) => (
                      <option key={horse.id} value={horse.id}>
                        {horse.name}
                      </option>
                    ))}
                  </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none md:hidden" />
                  </div>
                )}
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-gray-700 font-medium">{TR.expenses.category} *</Label>
              <div className="relative">
              <select
                  ref={categorySelectRef}
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                  onMouseDown={handleSelectMouseDown}
                  onTouchStart={handleSelectTouchStart}
                required
                disabled={isSubmitting}
                tabIndex={isTrainer && !isSingleHorseMode ? -1 : 0}
                  className="flex h-11 w-full rounded-md border border-gray-300 bg-background px-3 py-2 pr-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:border-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer md:cursor-default"
              >
                <option value="">Kategori seçin</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none md:hidden" />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-gray-700 font-medium">{TR.expenses.date} *</Label>
              <TurkishDateInput
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                disabled={isSubmitting}
                tabIndex={isTrainer && !isSingleHorseMode ? -1 : 0}
                className="border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
              />
            </div>

            {/* Custom Category Name */}
            {category === 'OZEL' && (
              <div className="space-y-2">
                <Label htmlFor="customCategory" className="text-gray-700 font-medium">Özel Kategori Adı *</Label>
                <Input
                  id="customCategory"
                  type="text"
                  placeholder="Kategori adı girin"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="h-11 w-full border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
                />
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-gray-700 font-medium">{TR.expenses.amount} (₺) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={isSubmitting}
                tabIndex={isTrainer && !isSingleHorseMode ? -1 : 0}
                className="h-11 w-full border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-700 font-medium">Not *</Label>
              <textarea
                id="notes"
                placeholder="Not Ekleyin"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                tabIndex={isTrainer && !isSingleHorseMode ? -1 : 0}
                className="flex w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:border-[#6366f1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label htmlFor="photo" className="text-gray-700 font-medium">{TR.expenses.photo}</Label>
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
                  {TR.common.cancel}
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isSubmitting
                    ? TR.common.loading
                    : submitLabel || (isEditMode ? 'Kaydet' : TR.expenses.addExpense)}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

