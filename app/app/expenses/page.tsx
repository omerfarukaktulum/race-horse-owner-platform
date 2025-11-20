'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Filter, Pencil, Plus, Trash2, X, Paperclip, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { formatCurrency, formatDateShort } from '@/lib/utils/format'
import { TR } from '@/lib/constants/tr'
import { AddExpenseModal } from '@/app/components/modals/add-expense-modal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { useAuth } from '@/lib/context/auth-context'

interface Expense {
  id: string
  date: string
  category: string
  customName?: string
  amount: number | string
  currency: string
  note?: string
  photoUrl?: string | string[] | null
  addedById: string
  horse: {
    id: string
    name: string
    stablemate?: {
      id: string
      name: string
    } | null
  }
  addedBy: {
    email: string
    role: string
    ownerProfile?: { officialName: string }
    trainerProfile?: { fullName: string }
  }
}

type RangeKey = 'lastWeek' | 'lastMonth' | 'last3Months' | 'thisYear'

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'lastWeek', label: 'Son 1 Hafta' },
  { value: 'lastMonth', label: 'Son 1 Ay' },
  { value: 'last3Months', label: 'Son 3 Ay' },
  { value: 'thisYear', label: 'Bu Yıl' },
]


const getAttachments = (input?: string | string[] | null) => {
  if (!input) return []
  if (Array.isArray(input)) return input.filter(Boolean)
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean)
        }
      } catch {
        // ignore parse error
      }
    }
    return [trimmed]
  }
  return []
}

export default function ExpensesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])
  const [addedByFilters, setAddedByFilters] = useState<string[]>([])
  const [stablemateFilters, setStablemateFilters] = useState<string[]>([])
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [attachmentViewer, setAttachmentViewer] = useState<{
    open: boolean
    attachments: string[]
    currentIndex: number
  }>({
    open: false,
    attachments: [],
    currentIndex: 0,
  })

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/expenses', {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Giderler yüklenemedi')
      }

      // Transform the data to match our interface
      const transformedExpenses = (data.expenses || []).map((exp: any) => ({
        ...exp,
        currency: exp.currency || 'TRY',
      }))
      setExpenses(transformedExpenses)
    } catch (error) {
      console.error('Fetch expenses error:', error)
      toast.error('Giderler yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/expenses/${expenseToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Gider silinemedi')
      }
      toast.success('Gider başarıyla silindi')
      setIsDeleteDialogOpen(false)
      setExpenseToDelete(null)
      fetchExpenses()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gider silinirken hata oluştu'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const openAttachmentViewer = (attachments: string[], startIndex = 0) => {
    if (!attachments.length) return
    setAttachmentViewer({
      open: true,
      attachments,
      currentIndex: startIndex,
    })
  }

  const closeAttachmentViewer = () => {
    setAttachmentViewer({
      open: false,
      attachments: [],
      currentIndex: 0,
    })
  }

  const showPrevAttachment = useCallback(() => {
    setAttachmentViewer((prev) => {
      const total = prev.attachments.length
      if (!total) return prev
      return {
        ...prev,
        currentIndex: (prev.currentIndex - 1 + total) % total,
      }
    })
  }, [])

  const showNextAttachment = useCallback(() => {
    setAttachmentViewer((prev) => {
      const total = prev.attachments.length
      if (!total) return prev
      return {
        ...prev,
        currentIndex: (prev.currentIndex + 1) % total,
      }
    })
  }, [])

  useEffect(() => {
    if (!attachmentViewer.open || attachmentViewer.attachments.length < 2) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        showPrevAttachment()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        showNextAttachment()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [attachmentViewer.open, attachmentViewer.attachments.length, showPrevAttachment, showNextAttachment])

  useEffect(() => {
    if (!showFilterDropdown) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFilterDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilterDropdown])

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [expenses])

  const getAmountValue = (amount?: number | string) => {
    if (typeof amount === 'number') {
      return isNaN(amount) ? 0 : amount
    }
    if (typeof amount === 'string') {
      const parsed = parseFloat(amount)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  const getCategoryLabel = (expense: Expense) => {
    if (expense.customName && expense.customName.trim().length > 0) {
      return expense.customName
    }

    const translation =
      TR.expenseCategories[
        expense.category as keyof typeof TR.expenseCategories
      ]

    return translation || expense.category
  }

  const filteredExpenses = useMemo(() => {
    let filtered = sortedExpenses

    // Apply date range filter
    if (selectedRange) {
      const now = new Date()
      let startDate: Date | null = null

      switch (selectedRange) {
        case 'lastWeek':
          startDate = new Date(now)
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'lastMonth':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case 'last3Months':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 3)
          break
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = null
      }

      if (startDate) {
        filtered = filtered.filter(expense => {
          const expenseDate = new Date(expense.date)
          return expenseDate >= startDate!
        })
      }
    }

    // Apply category filter
    if (categoryFilters.length > 0) {
      filtered = filtered.filter((expense) => {
        const categoryLabel = getCategoryLabel(expense)
        return categoryFilters.includes(categoryLabel)
      })
    }

    // Apply addedBy filter (by role only)
    if (addedByFilters.length > 0) {
      filtered = filtered.filter((expense) => {
        const role = expense.addedBy?.role || 'Unknown'
        // Handle "At Sahibi" as value for OWNER role
        const filterValue = role === 'OWNER' ? 'At Sahibi' : role
        return addedByFilters.includes(filterValue) || addedByFilters.includes(role)
      })
    }

    // Apply stablemate filter (for trainers)
    if (stablemateFilters.length > 0 && user?.role === 'TRAINER') {
      filtered = filtered.filter((expense) => {
        const stablemateName = expense.horse?.stablemate?.name
        return stablemateName && stablemateFilters.includes(stablemateName)
      })
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((expense) => {
        // Search in horse name (At)
        if (expense.horse?.name && expense.horse.name.toLowerCase().includes(query)) {
          return true
        }
        // Search in category (Kategori)
        const categoryLabel = getCategoryLabel(expense)
        if (categoryLabel.toLowerCase().includes(query)) {
          return true
        }
        // Search in detail (Detay/note)
        if (expense.note && expense.note.toLowerCase().includes(query)) {
          return true
        }
        return false
      })
    }

    return filtered
  }, [selectedRange, categoryFilters, addedByFilters, stablemateFilters, sortedExpenses, searchQuery, user?.role])

  const totalAmount = filteredExpenses.reduce((acc, expense) => acc + getAmountValue(expense.amount), 0)
  const defaultCurrency = filteredExpenses[0]?.currency || sortedExpenses[0]?.currency || 'TRY'

  // Get unique categories
  const getUniqueCategories = useMemo(() => {
    const categorySet = new Set<string>()
    sortedExpenses.forEach((expense) => {
      const categoryLabel = getCategoryLabel(expense)
      if (categoryLabel) {
        categorySet.add(categoryLabel)
      }
    })
    return Array.from(categorySet).sort()
  }, [sortedExpenses])

  // Get unique addedBy users (by role only)
  const getUniqueAddedBy = useMemo(() => {
    const roleMap: Record<string, string> = {
      OWNER: 'At Sahibi',
      TRAINER: 'Antrenör',
      GROOM: 'Groom',
      ADMIN: 'Admin',
    }
    const roleSet = new Set<string>()
    sortedExpenses.forEach((expense) => {
      if (expense.addedBy && expense.addedBy.role) {
        roleSet.add(expense.addedBy.role)
      }
    })
    const roles = Array.from(roleSet)
    return roles.map((role) => ({
      value: role === 'OWNER' ? 'At Sahibi' : role,
      label: roleMap[role] || role,
    }))
  }, [sortedExpenses])

  // Get unique stablemates (for trainers)
  const getUniqueStablemates = useMemo(() => {
    if (user?.role !== 'TRAINER') return []
    const stablemateSet = new Set<string>()
    sortedExpenses.forEach((expense) => {
      if (expense.horse?.stablemate?.name) {
        stablemateSet.add(expense.horse.stablemate.name)
      }
    })
    return Array.from(stablemateSet).sort()
  }, [sortedExpenses, user?.role])

  // Toggle functions
  const toggleCategoryFilter = (category: string) => {
    setCategoryFilters((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }

  const toggleAddedByFilter = (addedBy: string) => {
    setAddedByFilters((prev) =>
      prev.includes(addedBy)
        ? prev.filter((a) => a !== addedBy)
        : [...prev, addedBy]
    )
  }

  const toggleStablemateFilter = (stablemate: string) => {
    setStablemateFilters((prev) =>
      prev.includes(stablemate)
        ? prev.filter((s) => s !== stablemate)
        : [...prev, stablemate]
    )
  }

  const clearFilters = () => {
    setSelectedRange(null)
    setCategoryFilters([])
    setAddedByFilters([])
    setStablemateFilters([])
  }

  const hasActiveFilters = !!selectedRange || categoryFilters.length > 0 || addedByFilters.length > 0 || stablemateFilters.length > 0

  const formatAddedBy = (expense: Expense) => {
    if (!expense.addedBy) return '-'
    const roleMap: Record<string, string> = {
      OWNER: 'At Sahibi',
      TRAINER: 'Antrenör',
    }
    const roleLabel = roleMap[expense.addedBy.role] || expense.addedBy.role || ''
    const profileName =
      expense.addedBy.ownerProfile?.officialName ||
      expense.addedBy.trainerProfile?.fullName ||
      ''

    // Always show role label, and name in parentheses if available
    if (profileName) {
      return `${roleLabel} (${profileName})`
    }

    return roleLabel || 'Bilinmiyor'
  }

  const hasExpenses = (expenses?.length || 0) > 0
  const isEditModalVisible = isEditModalOpen && !!editingExpense

  return (
    <div className="space-y-4">
      {/* Filter and Add buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative filter-dropdown-container" ref={filterDropdownRef}>
                <Button
                  variant="outline"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`border-2 font-medium px-4 h-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
                hasActiveFilters
                  ? 'border-[#6366f1] bg-indigo-50 text-[#6366f1]'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrele
              {hasActiveFilters && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#6366f1] text-white text-xs font-semibold">
                  {(selectedRange ? 1 : 0) + categoryFilters.length + addedByFilters.length + stablemateFilters.length}
                </span>
              )}
            </Button>

            {showFilterDropdown && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Filtreler</h3>
                  <button
                    onClick={() => setShowFilterDropdown(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Date Range Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Tarih Aralığı</label>
                  <div className="flex flex-wrap gap-2">
                    {RANGE_OPTIONS.map(option => {
                      const isActive = selectedRange === option.value
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            const nextValue = isActive ? null : option.value
                            setSelectedRange(nextValue)
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
            </div>
          </div>

                {/* Category Filter */}
                {getUniqueCategories.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Kategori</label>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueCategories.map((category) => (
                        <button
                          key={category}
                          onClick={() => toggleCategoryFilter(category)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            categoryFilters.includes(category)
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
              </div>
                )}

                {/* Added By Filter */}
                {getUniqueAddedBy.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Ekleyen</label>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueAddedBy.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => toggleAddedByFilter(option.value)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            addedByFilters.includes(option.value)
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
              </div>
                )}

                {/* Stablemate Filter (for trainers) */}
                {user?.role === 'TRAINER' && getUniqueStablemates.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Eküri</label>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueStablemates.map((stablemate) => (
                        <button
                          key={stablemate}
                          onClick={() => toggleStablemateFilter(stablemate)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            stablemateFilters.includes(stablemate)
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {stablemate}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      clearFilters()
                      setShowFilterDropdown(false)
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Search Button */}
          {!isSearchOpen ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSearchOpen(true)}
              className="h-10 w-10 p-0 border-2 border-gray-300 hover:bg-gray-50"
            >
              <Search className="h-4 w-4 text-gray-600" />
            </Button>
          ) : (
            <div className="relative w-52">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="At, kategori, detay ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-10 w-full pl-8 pr-8 text-sm border-2 border-[#6366f1] bg-indigo-50 text-gray-900 rounded-lg shadow-md focus:border-[#6366f1] focus:outline-none transition-all duration-300 placeholder:text-gray-500 placeholder:text-sm"
                autoFocus
                style={{ boxShadow: 'none' }}
                onFocus={(e) => {
                  e.target.style.boxShadow = 'none'
                  e.target.style.outline = 'none'
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false)
                  setSearchQuery('')
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Toplam</p>
            <p className="text-lg font-semibold text-indigo-600">
              {formatCurrency(totalAmount, defaultCurrency)}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Gider Ekle
          </Button>
            </div>
              </div>

      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg overflow-hidden">
        <CardContent className={hasExpenses ? 'p-0' : 'py-16 text-center'}>
          {!hasExpenses ? (
            <p className="text-gray-500">{TR.expenses.noExpenses}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      At
                    </th>
                    {user?.role === 'TRAINER' && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Eküri
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tutar
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Detay
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Ekleyen
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={user?.role === 'TRAINER' ? 8 : 7} className="px-4 py-6 text-center text-sm text-gray-500">
                        Seçilen filtrelerde gider bulunamadı
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense, index) => {
                      const isStriped = index % 2 === 1
                      const attachments = getAttachments(expense.photoUrl)
                      return (
                        <tr
                          key={expense.id}
                          className={`transition-colors hover:bg-indigo-50/50 ${isStriped ? 'bg-gray-50' : ''}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {formatDateShort(expense.date)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {expense.horse?.name || '-'}
                            </span>
                          </td>
                          {user?.role === 'TRAINER' && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-700">
                                {expense.horse?.stablemate?.name || '-'}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 px-2.5 py-0.5 text-xs font-semibold">
                              {getCategoryLabel(expense)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold text-rose-600">
                              {formatCurrency(getAmountValue(expense.amount), expense.currency)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {expense.note ? (
                              <p className="text-sm text-gray-700">{expense.note}</p>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{formatAddedBy(expense)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-start gap-2">
                              {attachments.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openAttachmentViewer(attachments)}
                                  className="p-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors shadow-sm"
                                  title={`${attachments.length} ek görüntüle`}
                                >
                                  <Paperclip className="h-4 w-4" />
                                </button>
                              )}
                              {user && expense.addedById === user.id && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditClick(expense)}
                                    className="p-2 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-sm"
                                    title="Düzenle"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClick(expense)}
                                    className="p-2 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800 transition-colors shadow-sm"
                                    title="Sil"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
                          </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Modal */}
      <AddExpenseModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false)
          fetchExpenses()
        }}
      />

      {/* Edit Expense Modal */}
      <AddExpenseModal
        open={isEditModalVisible}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingExpense(null)
        }}
        preselectedHorseId={editingExpense?.horse?.id}
        preselectedHorseName={editingExpense?.horse?.name}
        onSuccess={() => {
          setIsEditModalOpen(false)
          setEditingExpense(null)
          fetchExpenses()
        }}
        mode="edit"
        expenseId={editingExpense?.id}
        initialExpense={
          editingExpense
            ? {
                date: editingExpense.date,
                category: editingExpense.category,
                amount: editingExpense.amount,
                currency: editingExpense.currency,
                note: editingExpense.note,
                customName: editingExpense.customName,
                photoUrl: editingExpense.photoUrl,
              }
            : undefined
        }
        submitLabel="Kaydet"
      />

      {/* Delete Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(value) => {
          setIsDeleteDialogOpen(value)
          if (!value) {
            setExpenseToDelete(null)
          }
        }}
      >
        <DialogContent className="max-w-sm bg-white/95 backdrop-blur border border-rose-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">Gideri Sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bu gideri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setExpenseToDelete(null)
              }}
              className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
              disabled={isDeleting}
            >
              İptal
            </Button>
                        <Button
              onClick={handleDeleteExpense}
              disabled={isDeleting}
              className="bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md hover:from-rose-600 hover:to-rose-700"
            >
              {isDeleting ? TR.common.loading : 'Sil'}
                        </Button>
                      </div>
        </DialogContent>
      </Dialog>

      {/* Attachment Viewer */}
      <Dialog open={attachmentViewer.open} onOpenChange={(value) => !value && closeAttachmentViewer()}>
        <DialogContent className="max-w-3xl bg-white/95 backdrop-blur border border-gray-200 shadow-2xl">
          {attachmentViewer.attachments.length > 0 && (
            <div className="space-y-6">
              <div className="relative w-full h-[60vh] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <img
                  src={attachmentViewer.attachments[attachmentViewer.currentIndex]}
                  alt={`Ek ${attachmentViewer.currentIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
                {attachmentViewer.attachments.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={showPrevAttachment}
                      aria-label="Önceki ek"
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/80 text-gray-700 shadow-lg backdrop-blur flex items-center justify-center hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={showNextAttachment}
                      aria-label="Sonraki ek"
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/80 text-gray-700 shadow-lg backdrop-blur flex items-center justify-center hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              {attachmentViewer.attachments.length > 1 && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={showPrevAttachment}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Önceki
                  </Button>
                  <span className="text-sm font-medium text-gray-600">
                    {attachmentViewer.currentIndex + 1} / {attachmentViewer.attachments.length}
                  </span>
                  <Button
                    variant="outline"
                    onClick={showNextAttachment}
                    className="flex items-center gap-2"
                  >
                    Sonraki
                    <ChevronRight className="h-4 w-4" />
                  </Button>
            </div>
              )}
        </div>
      )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
