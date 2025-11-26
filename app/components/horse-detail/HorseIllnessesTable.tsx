'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Filter, Pencil, Trash2, Paperclip, X, ChevronLeft, ChevronRight, Eye, Plus } from 'lucide-react'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { formatDateShort } from '@/lib/utils/format'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { AddIllnessModal } from '@/app/components/modals/add-illness-modal'
import { AddIllnessOperationModal } from '@/app/components/modals/add-illness-operation-modal'
import { toast } from 'sonner'
import { useAuth } from '@/lib/context/auth-context'

interface HorseIllnessOperation {
  id: string
  date: string
  description?: string | null
  photoUrl?: string | string[]
  addedById: string
  addedBy: {
    email: string
    role: string
    ownerProfile?: { officialName: string }
    trainerProfile?: { fullName: string }
    name?: string
  }
}

interface HorseIllness {
  id: string
  startDate: string
  endDate?: string | null
  detail?: string | null
  photoUrl?: string | string[]
  addedById: string
  createdAt?: string
  updatedAt?: string
  addedBy: {
    email: string
    role: string
    ownerProfile?: { officialName: string }
    trainerProfile?: { fullName: string }
    name?: string
  }
  operations?: HorseIllnessOperation[]
}

interface Props {
  illnesses: HorseIllness[]
  horseId: string
  horseName: string
  onRefresh?: () => void
  hideButtons?: boolean
  onFilterTriggerReady?: (trigger: () => void) => void
  showFilterDropdown?: boolean
  onFilterDropdownChange?: (show: boolean) => void
  filterDropdownContainerRef?: React.RefObject<HTMLDivElement>
  onActiveFiltersChange?: (count: number) => void
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

function formatAddedBy(illness: HorseIllness) {
  if (!illness.addedBy) return '-'
  const roleLabel = ROLE_MAP[illness.addedBy.role] || illness.addedBy.role || ''
  const profileName =
    illness.addedBy.ownerProfile?.officialName ||
    illness.addedBy.trainerProfile?.fullName ||
    illness.addedBy.name

  if (roleLabel && profileName) {
    return `${roleLabel} (${profileName})`
  }

  return roleLabel || profileName || 'Bilinmiyor'
}

export function HorseIllnessesTable({ 
  illnesses, 
  horseId, 
  horseName, 
  onRefresh, 
  hideButtons = false, 
  onFilterTriggerReady, 
  showFilterDropdown: externalShowFilterDropdown, 
  onFilterDropdownChange, 
  filterDropdownContainerRef, 
  onActiveFiltersChange 
}: Props) {
  const { user } = useAuth()
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [addedByFilters, setAddedByFilters] = useState<string[]>([])
  const [internalShowFilterDropdown, setInternalShowFilterDropdown] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingIllness, setEditingIllness] = useState<HorseIllness | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [illnessToDelete, setIllnessToDelete] = useState<HorseIllness | null>(null)
  const [illnessForOperation, setIllnessForOperation] = useState<HorseIllness | null>(null)
  const [isOperationModalOpen, setIsOperationModalOpen] = useState(false)
  const [editingOperation, setEditingOperation] = useState<HorseIllnessOperation | null>(null)
  const [isEditOperationModalOpen, setIsEditOperationModalOpen] = useState(false)
  const [operationToDelete, setOperationToDelete] = useState<HorseIllnessOperation | null>(null)
  const [isDeleteOperationDialogOpen, setIsDeleteOperationDialogOpen] = useState(false)
  const [isDeletingOperation, setIsDeletingOperation] = useState(false)
  const [expandedIllnesses, setExpandedIllnesses] = useState<Set<string>>(new Set())
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

  const hasIllnesses = (illnesses?.length || 0) > 0

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

  // Sort illnesses by updatedAt (or createdAt) descending - latest first
  const sortedIllnesses = useMemo(() => {
    return [...(illnesses || [])].sort((a, b) => {
      // Use updatedAt if available, otherwise createdAt, otherwise startDate as fallback
      const dateA = a.updatedAt || a.createdAt || a.startDate
      const dateB = b.updatedAt || b.createdAt || b.startDate
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
  }, [illnesses])

  // Filter illnesses
  const filteredIllnesses = useMemo(() => {
    let filtered = sortedIllnesses

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
      }

      if (startDate) {
        filtered = filtered.filter((illness) => {
          const illnessStartDate = new Date(illness.startDate)
          return illnessStartDate >= startDate!
        })
      }
    }

    // Apply addedBy filter
    if (addedByFilters.length > 0) {
      filtered = filtered.filter((illness) => {
        const role = illness.addedBy?.role || 'Unknown'
        return addedByFilters.includes(role)
      })
    }

    return filtered
  }, [selectedRange, addedByFilters, sortedIllnesses])

  // Get unique addedBy users
  const getUniqueAddedBy = useMemo(() => {
    const roleMap: Record<string, string> = {
      OWNER: 'At Sahibi',
      TRAINER: 'Antrenör',
      GROOM: 'Groom',
    }
    const addedByMap = new Map<string, string>()
    sortedIllnesses.forEach((illness) => {
      if (illness.addedBy?.role) {
        const role = illness.addedBy.role
        if (!addedByMap.has(role)) {
          addedByMap.set(role, roleMap[role] || role)
        }
      }
    })
    return Array.from(addedByMap.entries()).map(([value, label]) => ({
      value,
      label,
    }))
  }, [sortedIllnesses])

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

  useEffect(() => {
    if (!showFilterDropdown) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const isInsideDropdownContent = dropdownContentRef.current?.contains(target)
      const isInsideDropdown = filterDropdownRef.current?.contains(target)
      const isInsidePortal = filterDropdownContainerRef?.current?.contains(target)
      const clickedElement = event.target as HTMLElement
      const isFilterButton = clickedElement?.closest('button')?.textContent?.includes('Filtrele') || 
                            clickedElement?.closest('[class*="Filtrele"]')
      
      if (!isInsideDropdownContent && !isInsideDropdown && !isInsidePortal && !isFilterButton) {
        setShowFilterDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilterDropdown, filterDropdownContainerRef, setShowFilterDropdown])

  const handleEditClick = (illness: HorseIllness) => {
    setEditingIllness(illness)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (illness: HorseIllness) => {
    setIllnessToDelete(illness)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteIllness = async () => {
    if (!illnessToDelete) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/horse-illnesses/${illnessToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Hastalık silinemedi')
      }
      toast.success('Hastalık başarıyla silindi')
      setIsDeleteDialogOpen(false)
      setIllnessToDelete(null)
      onRefresh?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hastalık silinirken hata oluştu'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteOperation = async () => {
    if (!operationToDelete) return
    setIsDeletingOperation(true)
    try {
      const response = await fetch(`/api/horse-illness-operations/${operationToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'İşlem silinemedi')
      }
      toast.success('İşlem başarıyla silindi')
      setIsDeleteOperationDialogOpen(false)
      setOperationToDelete(null)
      onRefresh?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'İşlem silinirken hata oluştu'
      toast.error(message)
    } finally {
      setIsDeletingOperation(false)
    }
  }

  function formatAddedByOperation(operation: HorseIllnessOperation) {
    if (!operation.addedBy) return '-'
    const roleLabel = ROLE_MAP[operation.addedBy.role] || operation.addedBy.role || ''
    const profileName =
      operation.addedBy.ownerProfile?.officialName ||
      operation.addedBy.trainerProfile?.fullName ||
      operation.addedBy.name

    if (roleLabel && profileName) {
      return `${roleLabel} (${profileName})`
    }

    return roleLabel || profileName || 'Bilinmiyor'
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

  const isEditModalVisible = isEditModalOpen && !!editingIllness

  return (
    <>
      <div className="space-y-4">
        {/* Filter dropdown container */}
        <div 
          className="relative filter-dropdown-container"
          ref={filterDropdownRef}
          style={{ visibility: hideButtons ? 'hidden' : 'visible', position: hideButtons ? 'absolute' : 'relative' }}
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
                  {activeFilterCount}
                </span>
              )}
            </Button>
          )}

          {!hideButtons && showFilterDropdown && (() => {
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
                      {getUniqueAddedBy.map((addedBy) => (
                        <button
                          type="button"
                          key={addedBy.value}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleAddedByFilter(addedBy.value)
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            addedByFilters.includes(addedBy.value)
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {addedBy.label}
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
            return dropdownContent
          })()}
        </div>

      {/* Portal dropdown for hideButtons mode */}
      {hideButtons && showFilterDropdown && filterDropdownContainerRef?.current && (() => {
        const dropdownContent = (
          <div ref={dropdownContentRef} className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-[100]">
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
                  {getUniqueAddedBy.map((addedBy) => (
                    <button
                      type="button"
                      key={addedBy.value}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleAddedByFilter(addedBy.value)
                      }}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        addedByFilters.includes(addedBy.value)
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {addedBy.label}
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
        return createPortal(dropdownContent, filterDropdownContainerRef.current)
      })()}

        {/* Mobile: Card Layout */}
        <div className="md:hidden">
          {!hasIllnesses ? (
            <div className="px-4 py-16 text-center text-sm text-gray-500">
              Henüz hastalık kaydı bulunmuyor
            </div>
          ) : filteredIllnesses.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              Filtrelere uygun hastalık kaydı bulunmuyor
            </div>
          ) : (
            <>
              {filteredIllnesses.map((illness) => {
                const photos = getPhotoList(illness.photoUrl)
                const canEdit = user?.id === illness.addedById || user?.role === 'ADMIN'
                const operations = illness.operations || []
                const isExpanded = expandedIllnesses.has(illness.id)
                const hasOperations = operations.length > 0

                return (
                  <div
                    key={illness.id}
                    className="bg-indigo-50/30 border-0 rounded-lg p-4 mb-3 first:mt-4"
                    style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 -10px 15px -3px rgba(0, 0, 0, 0.1), 0 -4px 6px -2px rgba(0, 0, 0, 0.05)' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="inline-flex items-center gap-2 mb-1 flex-nowrap">
                          <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {formatDateShort(illness.startDate)}
                          </span>
                          {illness.endDate && (
                            <>
                              <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                                - {formatDateShort(illness.endDate)}
                              </span>
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 whitespace-nowrap">Sona erdi</span>
                            </>
                          )}
                          {!illness.endDate && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 whitespace-nowrap">Devam ediyor</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {photos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => openAttachmentViewer(photos)}
                            className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            title={`${photos.length} ek görüntüle`}
                          >
                            <Paperclip className="h-4 w-4" />
                          </button>
                        )}
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditClick(illness)}
                              className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                              title="Düzenle"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(illness)}
                              className="p-1.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {illness.detail && (
                      <p className="text-sm text-gray-700 mb-2 line-clamp-3 whitespace-pre-wrap">
                        <span className="font-semibold">Detay:</span> {illness.detail}
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-2 mb-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                        {operations.length} müdahale
                      </span>
                      {hasOperations && (
                        <button
                          type="button"
                          onClick={() => {
                            const newExpanded = new Set(expandedIllnesses)
                            if (isExpanded) {
                              newExpanded.delete(illness.id)
                            } else {
                              newExpanded.add(illness.id)
                            }
                            setExpandedIllnesses(newExpanded)
                          }}
                          className="p-1.5 rounded-md bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                          title={isExpanded ? 'Gizle' : 'Göster'}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {!illness.endDate && (
                        <button
                          type="button"
                          onClick={() => {
                            setIllnessForOperation(illness)
                            setIsOperationModalOpen(true)
                          }}
                          className="p-1.5 rounded-md bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                          title="Müdahale Ekle"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {isExpanded && hasOperations && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                        {operations.map((operation, opIndex) => {
                          const opPhotos = getPhotoList(operation.photoUrl)
                          const canEditOp = user?.id === operation.addedById || user?.role === 'ADMIN'
                          
                          return (
                            <div
                              key={operation.id}
                              className={`p-3 rounded-md ${
                                opIndex % 2 === 0 ? 'bg-indigo-50/30' : 'bg-white'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 text-xs mb-1">
                                    <span className="font-medium text-gray-700">
                                      {formatDateShort(operation.date)}
                                    </span>
                                    <span className="text-gray-500">
                                      {formatAddedByOperation(operation)}
                                    </span>
                                  </div>
                                  {operation.description && (
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                      {operation.description}
                                    </p>
                                  )}
                                  {opPhotos.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {opPhotos.map((photo, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => openAttachmentViewer(opPhotos, idx)}
                                          className="relative group"
                                        >
                                          <img
                                            src={photo}
                                            alt={`Operation attachment ${idx + 1}`}
                                            className="w-12 h-12 object-cover rounded-md border border-gray-200 hover:border-[#6366f1] transition-colors"
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {canEditOp && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingOperation(operation)
                                        setIllnessForOperation(illness)
                                        setIsEditOperationModalOpen(true)
                                      }}
                                      className="p-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                      title="Düzenle"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOperationToDelete(operation)
                                        setIsDeleteOperationDialogOpen(true)
                                      }}
                                      className="p-1 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                      title="Sil"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">{formatAddedBy(illness)}</span>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Desktop: Table Layout */}
        <Card className="hidden md:block bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg overflow-hidden">
          <CardContent className={hasIllnesses ? 'p-0' : 'py-16 text-center'}>
            {!hasIllnesses ? (
              <p className="text-gray-500">Henüz hastalık kaydı bulunmuyor</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Başlangıç Tarihi
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Bitiş Tarihi
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Hastalık
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Müdahaleler
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
                    {filteredIllnesses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                          Filtrelere uygun hastalık kaydı bulunmuyor
                        </td>
                      </tr>
                    ) : (
                      filteredIllnesses.map((illness, index) => {
                        const isStriped = index % 2 === 1
                        const photos = getPhotoList(illness.photoUrl)
                        const canEdit = user?.id === illness.addedById || user?.role === 'ADMIN'
                        const operations = illness.operations || []
                        const isExpanded = expandedIllnesses.has(illness.id)
                        const hasOperations = operations.length > 0

                        return (
                          <>
                            <tr
                              key={illness.id}
                              className={`transition-colors hover:bg-indigo-50/50 ${
                                isStriped ? 'bg-gray-50/30' : ''
                              }`}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">
                                  {formatDateShort(illness.startDate)}
                                </span>
                              </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {illness.endDate ? (
                                <span className="text-sm font-medium text-gray-900">
                                  {formatDateShort(illness.endDate)}
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">Devam ediyor</span>
                              )}
                            </td>
                              <td className="px-4 py-3">
                                {illness.detail ? (
                                  <div className="text-sm text-gray-800">
                                    <p className="whitespace-pre-wrap">{illness.detail}</p>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                                    {operations.length} müdahale
                                  </span>
                                  {hasOperations && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newExpanded = new Set(expandedIllnesses)
                                        if (isExpanded) {
                                          newExpanded.delete(illness.id)
                                        } else {
                                          newExpanded.add(illness.id)
                                        }
                                        setExpandedIllnesses(newExpanded)
                                      }}
                                      className="p-2 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-sm"
                                      title={isExpanded ? 'Gizle' : 'Göster'}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  )}
                                  {!illness.endDate && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIllnessForOperation(illness)
                                        setIsOperationModalOpen(true)
                                      }}
                                      className="p-2 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-sm"
                                      title="Müdahale Ekle"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-700">{formatAddedBy(illness)}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-start gap-2">
                                  {photos.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => openAttachmentViewer(photos)}
                                      className="p-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors shadow-sm"
                                      title={`${photos.length} ek görüntüle`}
                                    >
                                      <Paperclip className="h-4 w-4" />
                                    </button>
                                  )}
                                  {canEdit && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleEditClick(illness)}
                                        className="p-2 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-sm"
                                        title="Düzenle"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteClick(illness)}
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
                            {isExpanded && hasOperations && (
                              <tr className={isStriped ? 'bg-gray-50/30' : ''}>
                                <td colSpan={6} className="px-4 py-3">
                                  <div className="pl-8 space-y-2 border-l-2 border-indigo-200">
                                    {operations.map((operation, opIndex) => {
                                      const opPhotos = getPhotoList(operation.photoUrl)
                                      const canEditOp = user?.id === operation.addedById || user?.role === 'ADMIN'
                                      
                                      return (
                                        <div
                                          key={operation.id}
                                          className={`p-3 rounded-md ${
                                            opIndex % 2 === 0 ? 'bg-indigo-50/30' : 'bg-white'
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-1">
                                              <div className="flex items-center gap-2 text-sm">
                                                <span className="font-medium text-gray-700">
                                                  {formatDateShort(operation.date)}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                  {formatAddedBy(operation)}
                                                </span>
                                              </div>
                                              {operation.description && (
                                                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                  {operation.description}
                                                </p>
                                              )}
                                              {opPhotos.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                  {opPhotos.map((photo, idx) => (
                                                    <button
                                                      key={idx}
                                                      onClick={() => openAttachmentViewer(opPhotos, idx)}
                                                      className="relative group"
                                                    >
                                                      <img
                                                        src={photo}
                                                        alt={`Operation attachment ${idx + 1}`}
                                                        className="w-16 h-16 object-cover rounded-md border border-gray-200 hover:border-[#6366f1] transition-colors"
                                                      />
                                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-md transition-colors flex items-center justify-center">
                                                        <Paperclip className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                      </div>
                                                    </button>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                            {canEditOp && (
                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingOperation(operation)
                                                    setIllnessForOperation(illness)
                                                    setIsEditOperationModalOpen(true)
                                                  }}
                                                  className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                                                  title="Düzenle"
                                                >
                                                  <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setOperationToDelete(operation)
                                                    setIsDeleteOperationDialogOpen(true)
                                                  }}
                                                  className="p-1.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800 transition-colors"
                                                  title="Sil"
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
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

      {/* Add Modal - only render when not using parent's modal */}
      {!hideButtons && (
        <AddIllnessModal
          open={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          horseId={horseId}
          horseName={horseName}
          onSuccess={() => {
            setIsAddModalOpen(false)
            onRefresh?.()
          }}
        />
      )}

      {/* Edit Modal */}
      {isEditModalVisible && editingIllness && (
        <AddIllnessModal
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingIllness(null)
          }}
          horseId={horseId}
          horseName={horseName}
          mode="edit"
          illnessId={editingIllness.id}
          initialIllness={{
            startDate: editingIllness.startDate,
            endDate: editingIllness.endDate || null,
            detail: editingIllness.detail || null,
            photoUrl: editingIllness.photoUrl,
          }}
          onSuccess={() => {
            setIsEditModalOpen(false)
            setEditingIllness(null)
            onRefresh?.()
          }}
        />
      )}

      {/* Add Operation Modal */}
      {illnessForOperation && (
        <AddIllnessOperationModal
          open={isOperationModalOpen}
          onClose={() => {
            setIsOperationModalOpen(false)
            setIllnessForOperation(null)
          }}
          illnessId={illnessForOperation.id}
          horseName={horseName}
          onSuccess={() => {
            setIsOperationModalOpen(false)
            setIllnessForOperation(null)
            onRefresh?.()
          }}
        />
      )}

      {/* Edit Operation Modal */}
      {isEditOperationModalOpen && editingOperation && illnessForOperation && (
        <AddIllnessOperationModal
          open={isEditOperationModalOpen}
          onClose={() => {
            setIsEditOperationModalOpen(false)
            setEditingOperation(null)
            setIllnessForOperation(null)
          }}
          illnessId={illnessForOperation.id}
          horseName={horseName}
          mode="edit"
          operationId={editingOperation.id}
          initialOperation={{
            date: editingOperation.date,
            description: editingOperation.description || null,
            photoUrl: editingOperation.photoUrl,
          }}
          onSuccess={() => {
            setIsEditOperationModalOpen(false)
            setEditingOperation(null)
            setIllnessForOperation(null)
            onRefresh?.()
          }}
        />
      )}

      {/* Delete Operation Confirmation Dialog */}
      <Dialog open={isDeleteOperationDialogOpen} onOpenChange={setIsDeleteOperationDialogOpen}>
        <DialogContent className="w-[320px] bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50">
          <DialogHeader>
            <DialogTitle>Müdahaleyi Sil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Bu müdahaleyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteOperationDialogOpen(false)
                  setOperationToDelete(null)
                }}
                disabled={isDeletingOperation}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteOperation}
                disabled={isDeletingOperation}
              >
                {isDeletingOperation ? 'Siliniyor...' : 'Sil'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[320px] bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50">
          <DialogHeader>
            <DialogTitle>Hastalığı Sil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Bu hastalık kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setIllnessToDelete(null)
                }}
                disabled={isDeleting}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteIllness}
                disabled={isDeleting}
              >
                {isDeleting ? 'Siliniyor...' : 'Sil'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer */}
      {attachmentViewer.open && (
        <Dialog open={attachmentViewer.open} onOpenChange={closeAttachmentViewer}>
          <DialogContent className="max-w-4xl bg-black/95 backdrop-blur-sm border border-gray-800 p-0">
            <div className="relative">
              <button
                onClick={closeAttachmentViewer}
                className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              {attachmentViewer.attachments.length > 1 && (
                <>
                  <button
                    onClick={showPrevAttachment}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </button>
                  <button
                    onClick={showNextAttachment}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </button>
                </>
              )}
              <img
                src={attachmentViewer.attachments[attachmentViewer.currentIndex]}
                alt={`Attachment ${attachmentViewer.currentIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              {attachmentViewer.attachments.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded">
                  {attachmentViewer.currentIndex + 1} / {attachmentViewer.attachments.length}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

