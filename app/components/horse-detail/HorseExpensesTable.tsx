'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Filter, Pencil, Plus, Trash2, X, Paperclip, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { formatCurrency, formatDateShort } from '@/lib/utils/format'
import { TR } from '@/lib/constants/tr'
import { AddExpenseModal } from '@/app/components/modals/add-expense-modal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'

interface Expense {
  id: string
  date: string
  category: string
  customName?: string
  amount: number | string
  currency: string
  note?: string
  photoUrl?: string | string[] | null
  addedBy: {
    email: string
    role: string
  }
}

type RangeKey = 'lastWeek' | 'lastMonth' | 'last3Months' | 'thisYear'

interface Props {
  expenses: Expense[]
  onAddExpense?: () => void
  horseId: string
  horseName: string
  onRefresh?: () => void
  hideButtons?: boolean
  onFilterTriggerReady?: (trigger: () => void) => void
  showFilterDropdown?: boolean
  onFilterDropdownChange?: (show: boolean) => void
  filterDropdownContainerRef?: React.RefObject<HTMLDivElement>
  searchQuery?: string
}

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

export function HorseExpensesTable({ expenses, onAddExpense, horseId, horseName, onRefresh, hideButtons = false, onFilterTriggerReady, showFilterDropdown: externalShowFilterDropdown, onFilterDropdownChange, filterDropdownContainerRef, searchQuery: externalSearchQuery }: Props) {
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])
  const [addedByFilters, setAddedByFilters] = useState<string[]>([])
  const [internalShowFilterDropdown, setInternalShowFilterDropdown] = useState(false)
  const [internalSearchQuery, setInternalSearchQuery] = useState('')
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)
  
  // Use external search query when hideButtons is true, otherwise use internal state
  const searchQuery = hideButtons ? (externalSearchQuery || '') : internalSearchQuery
  
  // Use external control when hideButtons is true, otherwise use internal state
  const showFilterDropdown = hideButtons ? (externalShowFilterDropdown || false) : internalShowFilterDropdown
  const setShowFilterDropdown = hideButtons 
    ? (value: boolean | ((prev: boolean) => boolean)) => {
        const newValue = typeof value === 'function' ? value(showFilterDropdown) : value
        onFilterDropdownChange?.(newValue)
      }
    : setInternalShowFilterDropdown
  
  // Expose filter trigger to parent
  useEffect(() => {
    if (onFilterTriggerReady) {
      onFilterTriggerReady(() => {
        setShowFilterDropdown(prev => !prev)
      })
    }
  }, [onFilterTriggerReady, showFilterDropdown, setShowFilterDropdown])
  const hasExpenses = (expenses?.length || 0) > 0
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [attachmentViewer, setAttachmentViewer] = useState<{
    open: boolean
    attachments: string[]
    currentIndex: number
  }>({
    open: false,
    attachments: [],
    currentIndex: 0,
  })
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
      onRefresh?.()
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

  const showPrevAttachment = () => {
    setAttachmentViewer((prev) => {
      const total = prev.attachments.length
      if (!total) return prev
      return {
        ...prev,
        currentIndex: (prev.currentIndex - 1 + total) % total,
      }
    })
  }

  const showNextAttachment = () => {
    setAttachmentViewer((prev) => {
      const total = prev.attachments.length
      if (!total) return prev
      return {
        ...prev,
        currentIndex: (prev.currentIndex + 1) % total,
      }
    })
  }


  useEffect(() => {
    if (!showFilterDropdown) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      // Check if click is inside the dropdown content itself
      const isInsideDropdownContent = dropdownContentRef.current?.contains(target)
      
      // Check if click is inside the dropdown container (when not using portal)
      const isInsideDropdown = filterDropdownRef.current?.contains(target)
      
      // Check if click is inside the portal container (when using portal)
      const isInsidePortal = filterDropdownContainerRef?.current?.contains(target)
      
      // Check if click is on the filter button itself
      const clickedElement = event.target as HTMLElement
      const isFilterButton = clickedElement?.closest('button')?.textContent?.includes('Filtrele') || 
                            clickedElement?.closest('[class*="Filtrele"]')
      
      // Only close if click is outside all dropdown areas and not on the button
      if (!isInsideDropdownContent && !isInsideDropdown && !isInsidePortal && !isFilterButton) {
        setShowFilterDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilterDropdown, filterDropdownContainerRef])

  const sortedExpenses = useMemo(() => {
    return [...(expenses || [])].sort((a, b) => {
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

  const getCategoryLabel = useCallback((expense: Expense) => {
    if (expense.customName && expense.customName.trim().length > 0) {
      return expense.customName
    }

    const translation =
      TR.expenseCategories[
        expense.category as keyof typeof TR.expenseCategories
      ]

    return translation || expense.category
  }, [])

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

    // Apply addedBy filter
    if (addedByFilters.length > 0) {
      filtered = filtered.filter((expense) => {
        const role = expense.addedBy?.role || 'Unknown'
        return addedByFilters.includes(role)
      })
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((expense) => {
        // Search in horse name
        if (horseName.toLowerCase().includes(query)) {
          return true
        }
        // Search in category
        const categoryLabel = getCategoryLabel(expense)
        if (categoryLabel.toLowerCase().includes(query)) {
          return true
        }
        // Search in detail (note)
        if (expense.note && expense.note.toLowerCase().includes(query)) {
          return true
        }
        return false
      })
    }

    return filtered
  }, [selectedRange, categoryFilters, addedByFilters, sortedExpenses, getCategoryLabel, searchQuery, horseName])

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

  // Get unique addedBy users
  const getUniqueAddedBy = useMemo(() => {
    const roleMap: Record<string, string> = {
      OWNER: 'At Sahibi',
      TRAINER: 'Trainer',
      GROOM: 'Groom',
    }
    const addedByMap = new Map<string, string>()
    sortedExpenses.forEach((expense) => {
      if (expense.addedBy?.role) {
        const role = expense.addedBy.role
        if (!addedByMap.has(role)) {
          addedByMap.set(role, roleMap[role] || role)
        }
      }
    })
    return Array.from(addedByMap.entries()).map(([value, label]) => ({
      value,
      label,
    }))
  }, [sortedExpenses])

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

  const clearFilters = () => {
    setSelectedRange(null)
    setCategoryFilters([])
    setAddedByFilters([])
  }

  const hasActiveFilters = !!selectedRange || categoryFilters.length > 0 || addedByFilters.length > 0

  const formatAddedBy = (expense: Expense) => {
    if (!expense.addedBy) return '-'
    const roleMap: Record<string, string> = {
      OWNER: 'At Sahibi',
    }
    const roleLabel = roleMap[expense.addedBy.role] || expense.addedBy.role
    return roleLabel
      ? `${roleLabel}${expense.addedBy.email ? ` (${expense.addedBy.email})` : ''}`
      : expense.addedBy.email || '-'
  }

  const isEditModalVisible = isEditModalOpen && !!editingExpense

  return (
    <>
      <div className="space-y-4">
      {/* Filter dropdown container - always rendered for dropdown positioning */}
      <div 
        className="relative filter-dropdown-container"
        ref={filterDropdownRef}
        style={{ visibility: hideButtons ? 'hidden' : 'visible', position: hideButtons ? 'absolute' : 'relative' }}
      >
        {!hideButtons && (
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
                {(selectedRange ? 1 : 0) + categoryFilters.length + addedByFilters.length}
              </span>
            )}
          </Button>
        )}

        {showFilterDropdown && (() => {
          const dropdownContent = (
            <div ref={dropdownContentRef} className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Filtreler</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFilterDropdown(false)
                  }}
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
                        type="button"
                        key={option.value}
                        onClick={(e) => {
                          e.stopPropagation()
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
                        type="button"
                        key={category}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCategoryFilter(category)
                        }}
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
                        type="button"
                        key={option.value}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleAddedByFilter(option.value)
                        }}
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

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearFilters()
                    setShowFilterDropdown(false)
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>
          )

          // Render in parent's container if hideButtons is true and ref is provided
          if (hideButtons && filterDropdownContainerRef?.current) {
            return createPortal(dropdownContent, filterDropdownContainerRef.current)
          }

          return dropdownContent
        })()}
      </div>

      {!hideButtons && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-gray-500">Toplam</p>
              <p className="text-lg font-semibold text-indigo-600">
                {formatCurrency(totalAmount, defaultCurrency)}
              </p>
            </div>
            {onAddExpense && (
              <Button
                size="sm"
                onClick={onAddExpense}
                className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Gider Ekle
              </Button>
            )}
          </div>
        </div>
      )}

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
                <tbody className="divide-y divide-gray-100">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                        Seçilen tarih aralığında gider bulunamadı
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense, index) => {
                      const isStriped = index % 2 === 1
                      const attachments = getAttachments(expense.photoUrl)
                      return (
                        <tr
                          key={expense.id}
                          className={`transition-colors hover:bg-indigo-50/50 ${isStriped ? 'bg-gray-50/30' : ''}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {formatDateShort(expense.date)}
                            </span>
                          </td>
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
    </div>
      <AddExpenseModal
        open={isEditModalVisible}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingExpense(null)
        }}
        preselectedHorseId={horseId}
        preselectedHorseName={horseName}
        onSuccess={() => {
          setIsEditModalOpen(false)
          setEditingExpense(null)
          onRefresh?.()
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
        submitLabel="Gider Kaydet"
      />

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

      <Dialog open={attachmentViewer.open} onOpenChange={(value) => !value && closeAttachmentViewer()}>
        <DialogContent className="max-w-3xl bg-white/95 backdrop-blur border border-gray-200 shadow-2xl">
          {attachmentViewer.attachments.length > 0 && (
            <div className="space-y-6">
              <div className="w-full h-[60vh] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <img
                  src={attachmentViewer.attachments[attachmentViewer.currentIndex]}
                  alt={`Ek ${attachmentViewer.currentIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
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
    </>
  )
}

