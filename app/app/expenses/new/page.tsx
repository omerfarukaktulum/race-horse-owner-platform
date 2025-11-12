'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Checkbox } from '@/app/components/ui/checkbox'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'
import { EXPENSE_CATEGORIES } from '@/lib/constants/expense-categories'

interface Horse {
  id: string
  name: string
  status: string
  selected: boolean
}

export default function NewExpensePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedHorseId = searchParams.get('horseId')
  
  const [horses, setHorses] = useState<Horse[]>([])
  const [isLoadingHorses, setIsLoadingHorses] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    fetchHorses()
  }, [])

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
          selected: horse.id === preselectedHorseId, // Pre-select if matches query param
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
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır')
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Sadece resim dosyaları yüklenebilir')
        return
      }

      setPhoto(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const selectedHorses = horses.filter((h) => h.selected)

    if (selectedHorses.length === 0) {
      toast.error('Lütfen en az bir at seçin')
      return
    }

    if (!category) {
      toast.error('Lütfen bir kategori seçin')
      return
    }

    if (category === 'CUSTOM' && !customCategory) {
      toast.error('Lütfen özel kategori adı girin')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Lütfen geçerli bir tutar girin')
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('date', date)
      formData.append('category', category === 'CUSTOM' ? customCategory : category)
      formData.append('amount', amount)
      formData.append('notes', notes)
      formData.append('horseIds', JSON.stringify(selectedHorses.map((h) => h.id)))

      if (photo) {
        formData.append('photo', photo)
      }

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
      router.push('/app/expenses')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingHorses) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{TR.common.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{TR.expenses.addExpense}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Horse Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">{TR.expenses.selectHorses}</Label>
                {horses.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                  >
                    {horses.every((h) => h.selected)
                      ? 'Seçimi Temizle'
                      : TR.common.selectAll}
                  </Button>
                )}
              </div>

              {horses.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border rounded-lg">
                  <p>Henüz atınız bulunmuyor.</p>
                  <p className="text-sm mt-2">Önce at eklemeniz gerekiyor.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                  {horses.map((horse, index) => (
                    <div
                      key={horse.id}
                      className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded"
                    >
                      <Checkbox
                        checked={horse.selected}
                        onCheckedChange={() => toggleHorse(index)}
                      />
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => toggleHorse(index)}
                      >
                        <p className="font-medium">{horse.name}</p>
                        <p className="text-sm text-gray-500">{horse.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">{TR.expenses.date} *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">{TR.expenses.category} *</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                disabled={isSubmitting}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Kategori seçin</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
                <option value="CUSTOM">Özel (Kendi kategorinizi girin)</option>
              </select>
            </div>

            {/* Custom Category */}
            {category === 'CUSTOM' && (
              <div className="space-y-2">
                <Label htmlFor="customCategory">Özel Kategori Adı *</Label>
                <Input
                  id="customCategory"
                  type="text"
                  placeholder="Kategori adı girin"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">{TR.expenses.amount} (₺) *</Label>
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
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{TR.expenses.notes}</Label>
              <textarea
                id="notes"
                placeholder="İsteğe bağlı notlar"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                rows={4}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label htmlFor="photo">{TR.expenses.photo}</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={isSubmitting}
              />
              {photoPreview && (
                <div className="mt-2">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="max-w-xs rounded-lg border"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                {TR.common.cancel}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? TR.common.loading : TR.expenses.addExpense}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

