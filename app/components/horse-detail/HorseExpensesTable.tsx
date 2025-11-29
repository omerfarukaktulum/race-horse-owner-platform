'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Filter, Pencil, Plus, Trash2, X, Image, ChevronLeft, ChevronRight, Search, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { formatCurrency, formatDateShort } from '@/lib/utils/format'
import { TR } from '@/lib/constants/tr'
import { AddExpenseModal } from '@/app/components/modals/add-expense-modal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { useAuth } from '@/lib/context/auth-context'
import { EmptyState } from './EmptyState'

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
  addedBy: {
    email: string
    role: string
    ownerProfile?: { officialName: string }
    trainerProfile?: { fullName: string }
    name?: string
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
  onActiveFiltersChange?: (count: number) => void
  highlightExpenseId?: string
  onVisibleTotalChange?: (total: number, currency: string) => void
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

export function HorseExpensesTable({
  expenses,
  onAddExpense,
  horseId,
  horseName,
  onRefresh,
  hideButtons = false,
  onFilterTriggerReady,
  showFilterDropdown: externalShowFilterDropdown,
  onFilterDropdownChange,
  filterDropdownContainerRef,
  onActiveFiltersChange,
  highlightExpenseId,
  onVisibleTotalChange,
}: Props) {
  const { user } = useAuth()
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])
  const [addedByFilters, setAddedByFilters] = useState<string[]>([])
  const [internalShowFilterDropdown, setInternalShowFilterDropdown] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)
  const highlightedExpenseRowRef = useRef<HTMLDivElement | HTMLTableRowElement | null>(null)
  
  // Use external control when hideButtons is true, otherwise use internal state
  const showFilterDropdown = hideButtons ? (externalShowFilterDropdown || false) : internalShowFilterDropdown
  const setShowFilterDropdown = hideButtons 
    ? (value: boolean | ((prev: boolean) => boolean)) => {
        const currentValue = externalShowFilterDropdown || false
        const newValue = typeof value === 'function' ? value(currentValue) : value
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


  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement
      if (showFilterDropdown && !target.closest('.filter-dropdown-container')) {
        setShowFilterDropdown(false)
      }
    }

    if (showFilterDropdown) {
      // Use a small timeout to avoid immediate closure when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside as any)
        document.addEventListener('touchstart', handleClickOutside as any)
      }, 0)
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside as any)
        document.removeEventListener('touchstart', handleClickOutside as any)
      }
    }
  }, [showFilterDropdown, setShowFilterDropdown])

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
        // Search in category (Kategori)
        const categoryLabel = getCategoryLabel(expense)
        if (categoryLabel.toLowerCase().includes(query)) {
          return true
        }
        // Search in custom name
        if (expense.customName && expense.customName.toLowerCase().includes(query)) {
          return true
        }
        // Search in detail (Detay/note)
        if (expense.note && expense.note.toLowerCase().includes(query)) {
          return true
        }
        return false
      })
    }

    // Always include the highlighted expense, even if it would be filtered out
    if (highlightExpenseId) {
      const highlightedExpense = sortedExpenses.find(expense => expense.id === highlightExpenseId)
      if (highlightedExpense && !filtered.some(expense => expense.id === highlightExpenseId)) {
        // Add the highlighted expense to the filtered list in its correct sorted position
        filtered = [...filtered, highlightedExpense].sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        })
      }
    }

    return filtered
  }, [selectedRange, categoryFilters, addedByFilters, sortedExpenses, getCategoryLabel, highlightExpenseId, searchQuery])

  const canManageExpense = useCallback(
    (expense: Expense) => {
      if (!user) return false
      if (expense.addedById === user.id) return true

      const userIsOwnerOrTrainer = user.role === 'OWNER' || user.role === 'TRAINER'
      if (!userIsOwnerOrTrainer) return false

      const creatorRole = expense.addedBy?.role
      const creatorIsOwnerOrTrainer = creatorRole === 'OWNER' || creatorRole === 'TRAINER'

      return creatorIsOwnerOrTrainer
    },
    [user]
  )

  const totalAmount = filteredExpenses.reduce((acc, expense) => acc + getAmountValue(expense.amount), 0)
  const defaultCurrency = filteredExpenses[0]?.currency || sortedExpenses[0]?.currency || 'TRY'

  useEffect(() => {
    if (onVisibleTotalChange) {
      onVisibleTotalChange(totalAmount, defaultCurrency)
    }
  }, [totalAmount, defaultCurrency, onVisibleTotalChange])

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

  const activeFilterCount =
    (selectedRange ? 1 : 0) + categoryFilters.length + addedByFilters.length
  const hasActiveFilters = activeFilterCount > 0

  useEffect(() => {
    onActiveFiltersChange?.(activeFilterCount)
  }, [activeFilterCount, onActiveFiltersChange])

  const formatAddedBy = (expense: Expense) => {
    if (!expense.addedBy) return '-'
    const roleMap: Record<string, string> = {
    OWNER: 'At Sahibi',
    TRAINER: 'Antrenör',
    }
    const roleLabel = roleMap[expense.addedBy.role] || expense.addedBy.role
  const profileName =
    expense.addedBy.ownerProfile?.officialName ||
    expense.addedBy.trainerProfile?.fullName ||
    expense.addedBy.name

  if (roleLabel && profileName) {
    return `${roleLabel} (${profileName})`
  }

  return roleLabel || profileName || 'Bilinmiyor'
  }

  const isEditModalVisible = isEditModalOpen && !!editingExpense

  useEffect(() => {
    if (!highlightExpenseId) return
    
    // Check if expense exists in the full list (not just filtered)
    const hasHighlightedExpense = sortedExpenses.some(expense => expense.id === highlightExpenseId)
    if (!hasHighlightedExpense) return
    
    // Use multiple attempts with increasing delays to ensure tab is active and content is rendered
    const attemptScroll = (attempt = 0) => {
      // Try to find element by ref first, then by data attribute as fallback
      let element: HTMLDivElement | HTMLTableRowElement | null = highlightedExpenseRowRef.current
      
      if (!element) {
        const found = document.querySelector(`[data-expense-id="${highlightExpenseId}"]`)
        if (found && (found instanceof HTMLDivElement || found instanceof HTMLTableRowElement)) {
          element = found
        }
      }
      
      if (element) {
        // Check if element has dimensions (is rendered and visible)
        const rect = element.getBoundingClientRect()
        const isVisible = rect.width > 0 && rect.height > 0
        
        if (isVisible) {
          // Clean up observer
          if (observer) {
            observer.disconnect()
            observer = null
          }
          if (scrollTimeout) {
            clearTimeout(scrollTimeout)
            scrollTimeout = null
          }
          
          // Scroll to element
          setTimeout(() => {
            element?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            })
          }, 100)
          return true
        }
      }
      
      // Retry if element not found yet or not visible (max 25 attempts)
      if (attempt < 25) {
        const delay = Math.min(300 * (attempt + 1), 2000) // Cap at 2 seconds
        scrollTimeout = setTimeout(() => attemptScroll(attempt + 1), delay)
      } else {
        // Set up MutationObserver as fallback to watch for element appearance
        if (!observer) {
          observer = new MutationObserver(() => {
            const element = document.querySelector(`[data-expense-id="${highlightExpenseId}"]`)
            if (element) {
              const rect = element.getBoundingClientRect()
              if (rect.width > 0 && rect.height > 0) {
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'start',
                  inline: 'nearest'
                })
                if (observer) {
                observer.disconnect()
                observer = null
                }
              }
            }
          })
          
          observer.observe(document.body, {
            childList: true,
            subtree: true,
          })
          
          setTimeout(() => {
            if (observer) {
              observer.disconnect()
              observer = null
            }
          }, 10000)
        }
      }
      return false
    }
    
    let observer: MutationObserver | null = null
    let scrollTimeout: NodeJS.Timeout | null = null
    
    // Start first attempt after initial delay to allow tab switch and rendering
    scrollTimeout = setTimeout(() => attemptScroll(), 1500)
    
    // Cleanup function
    return () => {
      if (observer) {
        observer.disconnect()
        observer = null
      }
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
        scrollTimeout = null
      }
    }
  }, [highlightExpenseId, sortedExpenses])

  return (
    <>
      {/* Desktop: Filter dropdown container - always rendered for dropdown positioning */}
      <div 
        className="hidden md:flex items-center gap-3"
        style={{ visibility: hideButtons || !hasExpenses ? 'hidden' : 'visible' }}
      >
        <div 
          className="relative filter-dropdown-container"
          ref={filterDropdownRef}
        >
          {!hideButtons && hasExpenses && (
            <Button
              variant="outline"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`border-2 font-medium px-3 h-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
                hasActiveFilters
                  ? 'border-[#6366f1] bg-indigo-50 text-[#6366f1]'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#6366f1] text-white text-xs font-semibold">
                  {(selectedRange ? 1 : 0) + categoryFilters.length + addedByFilters.length}
                </span>
              )}
            </Button>
          )}

          {!hideButtons && showFilterDropdown && (
            <div 
              ref={dropdownContentRef} 
              className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-[100] filter-dropdown-container"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
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
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Desktop: Filter dropdown container - always rendered for dropdown positioning */}
        <div 
          className="hidden md:block relative filter-dropdown-container"
          ref={filterDropdownRef}
          style={{ visibility: hideButtons || !hasExpenses ? 'hidden' : 'visible', position: hideButtons ? 'absolute' : 'relative' }}
        >
        {!hideButtons && hasExpenses && (
          <Button
            variant="outline"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`border-2 font-medium px-3 h-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
              hasActiveFilters
                ? 'border-[#6366f1] bg-indigo-50 text-[#6366f1]'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            <Filter className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#6366f1] text-white text-xs font-semibold">
                {(selectedRange ? 1 : 0) + categoryFilters.length + addedByFilters.length}
              </span>
            )}
          </Button>
        )}

        {!hideButtons && showFilterDropdown && (
            <div 
              ref={dropdownContentRef} 
              className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-[100] filter-dropdown-container"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
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
        )}
        
        {/* Search Button */}
        {!hideButtons && hasExpenses && (
          <>
            {!isSearchOpen ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSearchOpen(true)}
                className="h-10 w-10 p-0 border-2 border-gray-300 hover:bg-gray-50"
              >
                <Search className="h-4 w-4 text-gray-600" />
              </Button>
            ) : (
              <div className="relative w-48 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Kategori, detay ..."
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
          </>
        )}
      </div>

      {/* Portal dropdown for hideButtons mode */}
      {hideButtons && showFilterDropdown && filterDropdownContainerRef?.current && createPortal((
          <div 
            ref={dropdownContentRef} 
            className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-[100] filter-dropdown-container"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
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
        ), filterDropdownContainerRef.current)}

      {!hideButtons && (
        <div className="hidden md:flex flex-wrap items-center justify-end gap-4">
          {onAddExpense && (
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-gray-500">Toplam</p>
                <p className="text-lg font-semibold text-indigo-600">
                  {formatCurrency(totalAmount, defaultCurrency)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button (FAB) for Add Expense */}
      {onAddExpense && (
        <Button
          onClick={onAddExpense}
          className="md:hidden fixed right-4 z-40 h-12 w-12 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center p-0 fab-button"
          style={{ bottom: 'calc(var(--bottom-tab-bar-height, 73px) + 1rem)' }}
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile: Filter Button */}
      {hasExpenses && (
      <div className="md:hidden mt-4 pb-0 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div 
            className="relative filter-dropdown-container"
            ref={filterDropdownRef}
          >
            {!hideButtons && (
              <Button
                variant="outline"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`border-2 font-medium px-3 h-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
                  hasActiveFilters
                    ? 'border-[#6366f1] bg-indigo-50 text-[#6366f1]'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <Filter className="h-4 w-4" />
                {hasActiveFilters && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#6366f1] text-white text-xs font-semibold">
                    {(selectedRange ? 1 : 0) + categoryFilters.length + addedByFilters.length}
                  </span>
                )}
              </Button>
            )}

            {!hideButtons && showFilterDropdown && (
            <div 
              ref={dropdownContentRef} 
              className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-[100] filter-dropdown-container"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
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
          )}
          </div>
          
          {/* Search Button */}
          {!isSearchOpen ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSearchOpen(true)}
              className="h-10 w-10 p-0 border-2 border-gray-300 hover:bg-gray-50"
            >
              <Search className="h-4 w-4 text-gray-600" />
            </Button>
          ) : (
            <div className="relative w-48 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Kategori, detay ..."
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
      </div>
      )}

      {/* Mobile: Card Layout */}
      <div className="md:hidden mt-4">
        {!hasExpenses ? (
          <EmptyState
            icon={Wallet}
            title="Gider kaydı bulunmuyor"
            description="Henüz gider kaydı eklenmemiş."
          />
        ) : filteredExpenses.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">
            Seçilen tarih aralığında gider bulunamadı
          </div>
        ) : (
          <>
            {filteredExpenses.map((expense) => {
              const isHighlighted = highlightExpenseId === expense.id
              const attachments = getAttachments(expense.photoUrl)
              return (
                <div
                  key={expense.id}
                  data-expense-id={expense.id}
                  ref={isHighlighted ? (el) => { highlightedExpenseRowRef.current = el } : undefined}
                  className={`bg-indigo-50/30 border-0 p-4 mb-3 ${
                    isHighlighted
                      ? 'rounded-2xl border-2 border-indigo-400'
                      : 'rounded-lg'
                  }`}
                  style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 -10px 15px -3px rgba(0, 0, 0, 0.1), 0 -4px 6px -2px rgba(0, 0, 0, 0.05)' }}
                >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatDateShort(expense.date)}
                        </span>
                        <div className="flex gap-1">
                          {attachments.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openAttachmentViewer(attachments)}
                              className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                              title={`${attachments.length} ek görüntüle`}
                            >
                              <Image className="h-4 w-4" />
                            </button>
                          )}
                          {canManageExpense(expense) && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditClick(expense)}
                                className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                title="Düzenle"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(expense)}
                                className="p-1.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 px-2.5 py-0.5 text-xs font-semibold">
                          {getCategoryLabel(expense)}
                        </span>
                        <span className="text-base font-bold text-rose-600">
                          {formatCurrency(getAmountValue(expense.amount), expense.currency)}
                        </span>
                      </div>
                      {expense.note && (
                        <p className="text-sm text-gray-700 mb-2 line-clamp-2">{expense.note}</p>
                      )}
                      <div className="pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">{formatAddedBy(expense)}</span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
      </div>

      {/* Desktop: Table Layout */}
      {!hasExpenses ? (
        <div className="hidden md:block mt-4">
          <EmptyState
            icon={Wallet}
            title="Gider kaydı bulunmuyor"
            description="Henüz gider kaydı eklenmemiş."
          />
        </div>
      ) : (
        <Card className="hidden md:block bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg overflow-hidden">
          <CardContent className="p-0">
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
                      const isHighlighted = highlightExpenseId === expense.id
                      const attachments = getAttachments(expense.photoUrl)
                      return (
                        <tr
                          key={expense.id}
                          data-expense-id={expense.id}
                          ref={isHighlighted ? (el) => { highlightedExpenseRowRef.current = el } : undefined}
                          className={`transition-colors ${
                            isHighlighted
                            ? 'bg-indigo-50 text-indigo-900 rounded-xl'
                            : `${isStriped ? 'bg-gray-50/30' : 'bg-white'} hover:bg-indigo-50/50`
                          }`}
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
                                  className="p-2 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-sm"
                                  title={`${attachments.length} ek görüntüle`}
                                >
                                  <Image className="h-4 w-4" />
                                </button>
                              )}
                                {canManageExpense(expense) && (
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
          </CardContent>
        </Card>
      )}
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
        submitLabel="Kaydet"
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

