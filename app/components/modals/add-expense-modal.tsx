'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Checkbox } from '@/app/components/ui/checkbox'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'
import { EXPENSE_CATEGORIES } from '@/lib/constants/expense-categories'
import { TurkishLira } from 'lucide-react'

interface Horse {
  id: string
  name: string
  status: string
  selected: boolean
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
  const [horses, setHorses] = useState<Horse[]>([])
  const [isLoadingHorses, setIsLoadingHorses] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSingleHorseMode = !!preselectedHorseId && !!preselectedHorseName
  const isEditMode = mode === 'edit'

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      if (isSingleHorseMode) {
        setHorses([{
          id: preselectedHorseId!,
          name: preselectedHorseName!,
          status: '',
          selected: true,
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
    }
    }
  }, [open, preselectedHorseId, preselectedHorseName, isSingleHorseMode, mode, initialExpense])

  const fetchHorses = async () => {
    try {
      const response = await fetch('/api/horses')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Atlar yüklenemedi')
      }

      setHorses(
        (data.horses || []).map((horse: any) => ({
          ...horse,
          selected: horse.id === preselectedHorseId,
        }))
      )
    } catch (error) {
      console.error('Fetch horses error:', error)
      toast.error('Atlar yüklenirken bir hata oluştu')
    } finally {
      setIsLoadingHorses(false)
    }
  }

  const toggleHorse = (index: number) => {
    setHorses(
      horses.map((horse, i) =>
        i === index ? { ...horse, selected: !horse.selected } : horse
      )
    )
  }

  const selectAll = () => {
    const allSelected = horses.every((h) => h.selected)
    setHorses(horses.map((h) => ({ ...h, selected: !allSelected })))
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
        const selectedHorses = horses.filter((h) => h.selected)
        if (selectedHorses.length === 0) {
          toast.error('Lütfen en az bir at seçin')
          setIsSubmitting(false)
          return
        }

      const formData = new FormData()
      formData.append('horseIds', JSON.stringify(selectedHorses.map((h) => h.id)))
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
          <div className="w-[240px] mx-auto space-y-5">
            {/* Horse Selection */}
            {!isSingleHorseMode && (
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  {TR.expenses.selectHorses}
                </Label>
                {horses.length > 1 && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAll}
                      className="border-2 border-[#6366f1]/30 hover:bg-[#6366f1]/5 hover:border-[#6366f1]/50 text-[#6366f1] text-xs"
                    >
                      {horses.every((h) => h.selected)
                        ? 'Seçimi Temizle'
                        : TR.common.selectAll}
                    </Button>
                  </div>
                )}

                {isLoadingHorses ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>{TR.common.loading}</p>
                  </div>
                ) : horses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border rounded-lg">
                    <p>Henüz atınız bulunmuyor.</p>
                    <p className="text-sm mt-2">Önce at eklemeniz gerekiyor.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto border-2 border-indigo-100/50 rounded-lg p-3 bg-gradient-to-br from-indigo-50/60 via-indigo-50/40 to-white">
                    {horses.map((horse, index) => (
                      <div
                        key={horse.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 cursor-pointer ${
                          horse.selected
                            ? 'bg-indigo-100/50 border-2 border-[#6366f1]'
                            : 'hover:bg-indigo-50/30 border-2 border-transparent'
                        }`}
                        onClick={() => toggleHorse(index)}
                      >
                        <Checkbox
                          checked={horse.selected}
                          onCheckedChange={() => toggleHorse(index)}
                          className="data-[state=checked]:bg-[#6366f1] data-[state=checked]:border-[#6366f1]"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{horse.name}</p>
                          <p className="text-xs text-gray-500">{horse.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-gray-700 font-medium">{TR.expenses.category} *</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                disabled={isSubmitting}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:border-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Kategori seçin</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-gray-700 font-medium">{TR.expenses.date} *</Label>
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

