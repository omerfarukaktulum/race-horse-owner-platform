'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Filter, Pencil, Trash2, Paperclip, X, ChevronLeft, ChevronRight, Plus, FileText } from 'lucide-react'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { formatDateShort } from '@/lib/utils/format'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { AddNoteModal } from '@/app/components/modals/add-note-modal'
import { toast } from 'sonner'
import { useAuth } from '@/lib/context/auth-context'
import { EmptyState } from './EmptyState'

interface HorseNote {
  id: string
  date: string
  note: string
  photoUrl?: string | string[]
  kiloValue?: number | null
  addedById: string
  addedBy: {
    email: string
    role: string
    ownerProfile?: { officialName: string }
    trainerProfile?: { fullName: string }
    name?: string
  }
}

interface Props {
  notes: HorseNote[]
  horseId: string
  horseName: string
  onRefresh?: () => void
  hideButtons?: boolean
  onFilterTriggerReady?: (trigger: () => void) => void
  showFilterDropdown?: boolean
  onFilterDropdownChange?: (show: boolean) => void
  filterDropdownContainerRef?: React.RefObject<HTMLDivElement>
  onActiveFiltersChange?: (count: number) => void
  highlightNoteId?: string
  onAddNote?: () => void
}

const ROLE_MAP: Record<string, string> = {
  OWNER: 'At Sahibi',
  TRAINER: 'Antrenör',
  GROOM: 'Groom',
}

type RangeKey = 'lastWeek' | 'lastMonth' | 'last3Months' | 'thisYear'

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'lastWeek', label: 'Son 1 Hafta' },
  { value: 'lastMonth', label: 'Son 1 Ay' },
  { value: 'last3Months', label: 'Son 3 Ay' },
  { value: 'thisYear', label: 'Bu Yıl' },
]

function getPhotoList(photoUrl?: string | string[]) {
  if (!photoUrl) return []
  if (Array.isArray(photoUrl)) return photoUrl.filter(Boolean)
  try {
    const parsed = JSON.parse(photoUrl)
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean)
    }
  } catch {
    // ignore parse error treat as string
  }
  return [photoUrl].filter(Boolean)
}

function formatAddedBy(note: HorseNote) {
  if (!note.addedBy) return '-'
  const roleLabel = ROLE_MAP[note.addedBy.role] || note.addedBy.role || ''
  const profileName =
    note.addedBy.ownerProfile?.officialName ||
    note.addedBy.trainerProfile?.fullName ||
    note.addedBy.name

  if (roleLabel && profileName) {
    return `${roleLabel} (${profileName})`
  }

  return roleLabel || profileName || 'Bilinmiyor'
}

export function HorseNotesList({ notes, horseId, horseName, onRefresh, hideButtons = false, onFilterTriggerReady, showFilterDropdown: externalShowFilterDropdown, onFilterDropdownChange, filterDropdownContainerRef, onActiveFiltersChange, highlightNoteId, onAddNote }: Props) {
  const { user } = useAuth()
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [addedByFilters, setAddedByFilters] = useState<string[]>([])
  const [internalShowFilterDropdown, setInternalShowFilterDropdown] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)
  const highlightedNoteRowRef = useRef<HTMLDivElement | HTMLTableRowElement | null>(null)
  
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
  const [editingNote, setEditingNote] = useState<HorseNote | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<HorseNote | null>(null)
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

  const hasNotes = (notes?.length || 0) > 0

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

  const sortedNotes = useMemo(() => {
    return [...(notes || [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [notes])

  const filteredNotes = useMemo(() => {
    let filtered = sortedNotes

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
        filtered = filtered.filter((note) => {
          const noteDate = new Date(note.date)
          return noteDate >= startDate!
        })
      }
    }

    // Apply addedBy filter
    if (addedByFilters.length > 0) {
      filtered = filtered.filter((note) => {
        const role = note.addedBy?.role || 'Unknown'
        return addedByFilters.includes(role)
      })
    }

    return filtered
  }, [selectedRange, addedByFilters, sortedNotes])

  const canManageNote = useCallback(
    (note: HorseNote) => {
      if (!user) return false
      if (note.addedById === user.id) return true

      const userIsOwnerOrTrainer = user.role === 'OWNER' || user.role === 'TRAINER'
      if (!userIsOwnerOrTrainer) return false

      const creatorRole = note.addedBy?.role
      const creatorIsOwnerOrTrainer = creatorRole === 'OWNER' || creatorRole === 'TRAINER'

      return creatorIsOwnerOrTrainer
    },
    [user]
  )

  // Get unique addedBy users
  const getUniqueAddedBy = useMemo(() => {
    const roleMap: Record<string, string> = {
      OWNER: 'At Sahibi',
      TRAINER: 'Antrenör',
      GROOM: 'Groom',
    }
    const addedByMap = new Map<string, string>()
    sortedNotes.forEach((note) => {
      if (note.addedBy?.role) {
        const role = note.addedBy.role
        if (!addedByMap.has(role)) {
          addedByMap.set(role, roleMap[role] || role)
        }
      }
    })
    return Array.from(addedByMap.entries()).map(([value, label]) => ({
      value,
      label,
    }))
  }, [sortedNotes])

  // Toggle functions
  const toggleAddedByFilter = (addedBy: string) => {
    setAddedByFilters((prev) =>
      prev.includes(addedBy)
        ? prev.filter((a) => a !== addedBy)
        : [...prev, addedBy]
    )
  }

  const clearFilters = () => {
    setSelectedRange(null)
    setAddedByFilters([])
  }

  const activeFilterCount =
    (selectedRange ? 1 : 0) + addedByFilters.length
  const hasActiveFilters = activeFilterCount > 0

  useEffect(() => {
    onActiveFiltersChange?.(activeFilterCount)
  }, [activeFilterCount, onActiveFiltersChange])

  // Scroll to highlighted note when it appears
  useEffect(() => {
    if (!highlightNoteId) return
    
    // Wait for the note to be in the filtered list and the ref to be set
    const hasHighlightedNote = filteredNotes.some(note => note.id === highlightNoteId)
    if (!hasHighlightedNote) return
    
    // Use multiple attempts with increasing delays to ensure tab is active and content is rendered
    const attemptScroll = (attempt = 0) => {
      // Try to find element by ref first, then by data attribute as fallback
      let element: HTMLDivElement | HTMLTableRowElement | null = highlightedNoteRowRef.current
      
      // Fallback: try to find by data attribute if ref isn't set yet
      if (!element) {
        const found = document.querySelector(`[data-note-id="${highlightNoteId}"]`)
        if (found && (found instanceof HTMLDivElement || found instanceof HTMLTableRowElement)) {
          element = found
        }
      }
      
      if (element) {
        // Check if element has dimensions (is rendered)
        const rect = element.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          // Use scrollIntoView which is more reliable and handles nested scroll containers
          // Small delay to ensure tab content is fully rendered
          setTimeout(() => {
            element?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            })
          }, 100)
          return true
        }
      }
      
      // Retry if element not found yet or not visible (max 15 attempts with longer delays)
      if (attempt < 15) {
        setTimeout(() => attemptScroll(attempt + 1), 300 * (attempt + 1))
      }
      return false
    }
    
    // Start first attempt after initial delay to allow tab switch and rendering
    setTimeout(() => attemptScroll(), 1000)
  }, [highlightNoteId, filteredNotes])

  const handleEditClick = (note: HorseNote) => {
    setEditingNote(note)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (note: HorseNote) => {
    setNoteToDelete(note)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteNote = async () => {
    if (!noteToDelete) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/horse-notes/${noteToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Not silinemedi')
      }
      toast.success('Not başarıyla silindi')
      setIsDeleteDialogOpen(false)
      setNoteToDelete(null)
      onRefresh?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Not silinirken hata oluştu'
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

  const isEditModalVisible = isEditModalOpen && !!editingNote

  return (
    <>
      <div className="space-y-4">
      {/* Desktop: Filter dropdown container - always rendered for dropdown positioning */}
      <div 
        className="hidden md:block relative filter-dropdown-container"
        ref={filterDropdownRef}
        style={{ visibility: hideButtons || !hasNotes ? 'hidden' : 'visible', position: hideButtons ? 'absolute' : 'relative' }}
      >
        {!hideButtons && hasNotes && (
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
                {activeFilterCount}
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
                  {RANGE_OPTIONS.map((option) => {
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
                {RANGE_OPTIONS.map((option) => {
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

      {/* Mobile: Filter Button */}
      <div className="md:hidden pt-0 pb-0 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div 
            className="relative filter-dropdown-container"
            ref={filterDropdownRef}
          >
            {!hideButtons && hasNotes && (
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
                    {activeFilterCount}
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
                  {RANGE_OPTIONS.map((option) => {
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
      </div>

      {/* Mobile: Card Layout */}
      <div className="md:hidden mt-4">
            {!hasNotes ? (
                <EmptyState
                  icon={FileText}
                  title="Not bulunmuyor"
                  description="Henüz not eklenmemiş."
                />
              ) : filteredNotes.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  Seçilen tarih aralığında not bulunamadı
                </div>
            ) : (
                <>
                  {filteredNotes.map((note) => {
                    const isHighlighted = highlightNoteId === note.id
                    const attachments = getPhotoList(note.photoUrl)
                    return (
                      <div
                        key={note.id}
                        data-note-id={note.id}
                        ref={isHighlighted ? (el) => {
                          if (el) {
                            highlightedNoteRowRef.current = el
                          }
                        } : undefined}
                        className={`bg-indigo-50/30 border-0 p-4 mb-3 ${
                          isHighlighted
                            ? 'rounded-2xl border-2 border-indigo-400'
                            : 'rounded-lg'
                        }`}
                        style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 -10px 15px -3px rgba(0, 0, 0, 0.1), 0 -4px 6px -2px rgba(0, 0, 0, 0.05)' }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatDateShort(note.date)}
                          </span>
                          <div className="flex gap-1">
                            {attachments.length > 0 && (
                              <button
                                type="button"
                                onClick={() => openAttachmentViewer(attachments)}
                                className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                title={`${attachments.length} ek görüntüle`}
                              >
                                <Paperclip className="h-4 w-4" />
                              </button>
                            )}
                            {canManageNote(note) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(note)}
                                  className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                  title="Düzenle"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClick(note)}
                                  className="p-1.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                  title="Sil"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {note.note && (
                          <p className="text-sm text-gray-700 mb-2 line-clamp-3">
                            {note.note.replace(/\s*\n+\s*/g, ' ').trim()}
                          </p>
                        )}
                        {note.kiloValue !== null && note.kiloValue !== undefined && (
                          <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-semibold mb-2">
                            ⚖️ {note.kiloValue.toFixed(1)} kg
                          </span>
                        )}
                        <div className="pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-500">{formatAddedBy(note)}</span>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
      </div>

      {/* Desktop: Table Layout */}
      {!hasNotes ? (
        <div className="hidden md:block mt-4">
          <EmptyState
            icon={FileText}
            title="Not bulunmuyor"
            description="Henüz not eklenmemiş."
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
                        Not
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
                    {filteredNotes.length === 0 ? (
                      <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                          Seçilen tarih aralığında not bulunamadı
                        </td>
                      </tr>
                    ) : (
                      filteredNotes.map((note, index) => {
                        const isStriped = index % 2 === 1
                      const isHighlighted = highlightNoteId === note.id
                        const attachments = getPhotoList(note.photoUrl)
                        return (
                          <tr
                            key={note.id}
                            data-note-id={note.id}
                          ref={isHighlighted ? (el) => {
                            if (el) {
                              highlightedNoteRowRef.current = el
                            }
                          } : undefined}
                            className={`transition-colors hover:bg-indigo-50/50 ${
                            isHighlighted
                              ? 'bg-indigo-50 text-indigo-900 rounded-xl'
                              : isStriped ? 'bg-gray-50/30' : ''
                          }`}
                        >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">
                                {formatDateShort(note.date)}
                              </span>
                            </td>
                          <td className="px-4 py-3">
                            {note.note ? (
                              <div className="text-sm text-gray-800 space-y-1">
                                <p>{note.note.replace(/\s*\n+\s*/g, ' ').trim()}</p>
                                {note.kiloValue !== null && note.kiloValue !== undefined && (
                                  <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-semibold">
                                    ⚖️ {note.kiloValue.toFixed(1)} kg
                            </span>
                                )}
                              </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-700">{formatAddedBy(note)}</span>
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
                                {canManageNote(note) && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEditClick(note)}
                                      className="p-2 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-sm"
                                      title="Düzenle"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteClick(note)}
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

      <AddNoteModal
        open={isEditModalVisible}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingNote(null)
        }}
        horseId={horseId}
        horseName={horseName}
        onSuccess={() => {
          setIsEditModalOpen(false)
          setEditingNote(null)
          onRefresh?.()
        }}
        mode="edit"
        noteId={editingNote?.id}
        initialNote={
          editingNote
            ? {
                date: editingNote.date,
                note: editingNote.note,
                photoUrl: editingNote.photoUrl,
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
            setNoteToDelete(null)
          }
        }}
      >
        <DialogContent className="max-w-sm bg-white/95 backdrop-blur border border-rose-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">Notu Sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bu notu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setNoteToDelete(null)
              }}
              className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
              disabled={isDeleting}
            >
              İptal
            </Button>
            <Button
              onClick={handleDeleteNote}
              disabled={isDeleting}
              className="bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md hover:from-rose-600 hover:to-rose-700"
            >
              {isDeleting ? 'Siliniyor...' : 'Sil'}
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

      {/* Floating Action Button (FAB) for Add Note */}
      {onAddNote && (
        <Button
          onClick={onAddNote}
          className="md:hidden fixed right-4 z-40 h-12 w-12 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center p-0 fab-button"
          style={{ bottom: 'calc(var(--bottom-tab-bar-height, 73px) + 1rem)' }}
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}
    </>
  )
}

