'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Plus, Trash2, Calendar, DollarSign, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'
import { EXPENSE_CATEGORIES } from '@/lib/constants/expense-categories'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface Expense {
  id: string
  date: string
  category: string
  amount: number
  notes: string | null
  photoUrl: string | null
  horse: {
    id: string
    name: string
  }
  addedBy: {
    email: string
    ownerProfile?: { officialName: string }
    trainerProfile?: { fullName: string }
  }
}

export default function ExpensesPage() {
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  
  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterHorseId, setFilterHorseId] = useState('')

  useEffect(() => {
    fetchExpenses()
  }, [filterCategory, filterStartDate, filterEndDate, filterHorseId])

  const fetchExpenses = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCategory) params.append('category', filterCategory)
      if (filterStartDate) params.append('startDate', filterStartDate)
      if (filterEndDate) params.append('endDate', filterEndDate)
      if (filterHorseId) params.append('horseId', filterHorseId)

      const response = await fetch(`/api/expenses?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Giderler yüklenemedi')
      }

      setExpenses(data.expenses || [])
    } catch (error) {
      console.error('Fetch expenses error:', error)
      toast.error('Giderler yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu gideri silmek istediğinizden emin misiniz?')) {
      return
    }

    setIsDeleting(id)

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Gider silinemedi')
      }

      toast.success('Gider silindi')
      fetchExpenses()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
    } finally {
      setIsDeleting(null)
    }
  }

  const clearFilters = () => {
    setFilterCategory('')
    setFilterStartDate('')
    setFilterEndDate('')
    setFilterHorseId('')
  }

  const getCategoryLabel = (category: string) => {
    const found = EXPENSE_CATEGORIES.find((c) => c.value === category)
    return found ? found.label : category
  }

  const getAddedByName = (expense: Expense) => {
    if (expense.addedBy.ownerProfile) {
      return expense.addedBy.ownerProfile.officialName
    }
    if (expense.addedBy.trainerProfile) {
      return expense.addedBy.trainerProfile.fullName
    }
    return expense.addedBy.email
  }

  // Group expenses by date
  const groupedExpenses = expenses.reduce((groups, expense) => {
    const date = new Date(expense.date).toLocaleDateString('tr-TR')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(expense)
    return groups
  }, {} as Record<string, Expense[]>)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{TR.expenses.title}</h1>
          <p className="text-gray-600 mt-1">
            Toplam {expenses.length} gider kaydı
          </p>
        </div>
        <Button onClick={() => router.push('/app/expenses/new')}>
          <Plus className="h-4 w-4 mr-2" />
          {TR.expenses.addExpense}
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{TR.common.filters}</CardTitle>
            <div className="flex gap-2">
              {(filterCategory || filterStartDate || filterEndDate || filterHorseId) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4 mr-1" />
                  Filtreleri Temizle
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                {showFilters ? 'Gizle' : 'Göster'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterCategory">{TR.expenses.category}</Label>
                <select
                  id="filterCategory"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Tümü</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterStartDate">Başlangıç Tarihi</Label>
                <Input
                  id="filterStartDate"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterEndDate">Bitiş Tarihi</Label>
                <Input
                  id="filterEndDate"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Expenses List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{TR.common.loading}</p>
          </div>
        </div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">Henüz gider kaydı bulunmuyor</p>
              <p className="text-sm mt-2">İlk giderinizi eklemek için yukarıdaki butonu kullanın</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedExpenses).map(([date, dateExpenses]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <h2 className="text-lg font-semibold">{date}</h2>
                <span className="text-sm text-gray-500">
                  ({dateExpenses.length} gider)
                </span>
              </div>

              <div className="space-y-3">
                {dateExpenses.map((expense) => (
                  <Card key={expense.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            {expense.photoUrl && (
                              <img
                                src={expense.photoUrl}
                                alt="Gider fotoğrafı"
                                className="w-20 h-20 object-cover rounded border"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{expense.horse.name}</h3>
                                <span className="text-sm px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                  {getCategoryLabel(expense.category)}
                                </span>
                              </div>
                              <p className="text-2xl font-bold text-indigo-600 mb-2">
                                {formatCurrency(expense.amount)}
                              </p>
                              {expense.notes && (
                                <p className="text-sm text-gray-600 mb-2">{expense.notes}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                Ekleyen: {getAddedByName(expense)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(expense.id)}
                          disabled={isDeleting === expense.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


