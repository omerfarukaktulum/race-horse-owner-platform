'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Filter, Pencil, Trash2, Paperclip, X, ChevronLeft, ChevronRight, Plus, Pill } from 'lucide-react'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { formatDateShort } from '@/lib/utils/format'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { AddBannedMedicineModal } from '@/app/components/modals/add-banned-medicine-modal'
import { toast } from 'sonner'
import { useAuth } from '@/lib/context/auth-context'
import { EmptyState } from './EmptyState'

interface BannedMedicine {
  id: string
  medicineName: string
  givenDate: string
  waitDays: number
  note?: string | null
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

interface Props {
  medicines: BannedMedicine[]
  horseId: string
  horseName: string
  onRefresh?: () => void
  hideButtons?: boolean
  onFilterTriggerReady?: (trigger: () => void) => void
  showFilterDropdown?: boolean
  onFilterDropdownChange?: (show: boolean) => void
  filterDropdownContainerRef?: React.RefObject<HTMLDivElement>
  onActiveFiltersChange?: (count: number) => void
  highlightBannedMedicineId?: string
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

function getPhotoList(photoUrl?: string | string[] | null) {
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

function formatAddedBy(medicine: BannedMedicine) {
  if (!medicine.addedBy) return '-'
  const roleLabel = ROLE_MAP[medicine.addedBy.role] || medicine.addedBy.role || ''
  const profileName =
    medicine.addedBy.ownerProfile?.officialName ||
    medicine.addedBy.trainerProfile?.fullName ||
    medicine.addedBy.name

  if (roleLabel && profileName) {
    return `${roleLabel} (${profileName})`
  }

  return roleLabel || profileName || 'Bilinmiyor'
}

function calculateRemainingDays(givenDate: string, waitDays: number): number {
  const given = new Date(givenDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  given.setHours(0, 0, 0, 0)
  
  const daysSinceGiven = Math.floor((today.getTime() - given.getTime()) / (1000 * 60 * 60 * 24))
  const remaining = waitDays - daysSinceGiven
  
  return Math.max(0, remaining)
}

export function BannedMedicinesTable({ medicines, horseId, horseName, onRefresh, hideButtons = false, onFilterTriggerReady, showFilterDropdown: externalShowFilterDropdown, onFilterDropdownChange, filterDropdownContainerRef, onActiveFiltersChange, highlightBannedMedicineId }: Props) {
  const { user } = useAuth()
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [internalShowFilterDropdown, setInternalShowFilterDropdown] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)
  const highlightedMedicineRowRef = useRef<HTMLDivElement | HTMLTableRowElement | null>(null)
  const [editingMedicine, setEditingMedicine] = useState<BannedMedicine | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [medicineToDelete, setMedicineToDelete] = useState<BannedMedicine | null>(null)
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

  // Scroll to highlighted medicine row
  useEffect(() => {
    if (!highlightBannedMedicineId) return
    
    const attemptScroll = (attempt = 0) => {
      let element: HTMLDivElement | HTMLTableRowElement | null = highlightedMedicineRowRef.current
      
      if (!element) {
        const found = document.querySelector(`[data-medicine-id="${highlightBannedMedicineId}"]`)
        if (found && (found instanceof HTMLDivElement || found instanceof HTMLTableRowElement)) {
          element = found
        }
      }
      
      if (element) {
        const rect = element.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          setTimeout(() => {
            element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 100)
          return true
        }
      }
      
      if (attempt < 10) {
        setTimeout(() => attemptScroll(attempt + 1), 200 * (attempt + 1))
      }
      return false
    }
    
    setTimeout(() => attemptScroll(), 500)
  }, [highlightBannedMedicineId, medicines.length])

  // Click outside handler
  useEffect(() => {
    if (!showFilterDropdown) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const isInsideTrigger = filterDropdownRef.current?.contains(target)
      const isInsideDropdown = dropdownContentRef.current?.contains(target)
      const isInsidePortalContainer = filterDropdownContainerRef?.current?.contains(target)

      if (!isInsideTrigger && !isInsideDropdown && !isInsidePortalContainer) {
        setShowFilterDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilterDropdown, filterDropdownContainerRef, setShowFilterDropdown])

  // Sort medicines by date (most recent first)
  const sortedMedicines = useMemo(() => {
    return [...medicines].sort((a, b) => {
      return new Date(b.givenDate).getTime() - new Date(a.givenDate).getTime()
    })
  }, [medicines])

  // Filter medicines based on selected filters
  const filteredMedicines = useMemo(() => {
    let filtered = sortedMedicines

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
        filtered = filtered.filter(medicine => {
          const medicineDate = new Date(medicine.givenDate)
          return medicineDate >= startDate!
        })
      }
    }

    return filtered
  }, [sortedMedicines, selectedRange])

  const clearFilters = () => {
    setSelectedRange(null)
  }

  const activeFilterCount = (selectedRange ? 1 : 0)
  const hasActiveFilters = activeFilterCount > 0

  useEffect(() => {
    onActiveFiltersChange?.(activeFilterCount)
  }, [activeFilterCount, onActiveFiltersChange])

  const handleEditClick = (medicine: BannedMedicine) => {
    setEditingMedicine(medicine)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (medicine: BannedMedicine) => {
    setMedicineToDelete(medicine)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!medicineToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/horses/${horseId}/banned-medicines/${medicineToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'İlaç kaydı silinemedi')
      }

      toast.success('İlaç kaydı silindi')
      onRefresh?.()
      setIsDeleteDialogOpen(false)
      setMedicineToDelete(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'İlaç kaydı silinirken hata oluştu'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const openAttachmentViewer = (attachments: string[], startIndex: number = 0) => {
    setAttachmentViewer({
      open: true,
      attachments,
      currentIndex: startIndex,
    })
  }

  const hasMedicines = (medicines?.length || 0) > 0

  return (
    <>
      {/* Desktop: Filter dropdown container */}
      <div 
        className="hidden md:block relative filter-dropdown-container mb-4"
        ref={filterDropdownRef}
        style={{ visibility: hideButtons || !hasMedicines ? 'hidden' : 'visible', position: hideButtons ? 'absolute' : 'relative' }}
      >
        {!hideButtons && hasMedicines && (
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

      {/* Mobile: Filter Button */}
      {hasMedicines && (
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
      )}

      {/* Mobile: Card Layout */}
      <div className="md:hidden">
        {!hasMedicines ? (
          <EmptyState
            icon={Pill}
            title="Çıkıcı ilaç kaydı bulunmuyor"
            description="Henüz ilaç kaydı eklenmemiş."
          />
        ) : filteredMedicines.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            Seçilen filtrelerde ilaç kaydı bulunamadı
          </div>
        ) : (
          <>
            {filteredMedicines.map((medicine) => {
              const attachments = getPhotoList(medicine.photoUrl)
              const remainingDays = calculateRemainingDays(medicine.givenDate, medicine.waitDays)
              const isExpired = remainingDays === 0
              const isHighlighted = highlightBannedMedicineId === medicine.id
              
              return (
                <div
                  key={medicine.id}
                  data-medicine-id={medicine.id}
                  ref={isHighlighted ? (el) => (highlightedMedicineRowRef.current = el) : undefined}
                  className={`bg-indigo-50/30 border-0 p-4 mb-3 first:mt-4 ${
                    isHighlighted
                      ? 'rounded-2xl border-2 border-indigo-400'
                      : 'rounded-lg'
                  }`}
                  style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 -10px 15px -3px rgba(0, 0, 0, 0.1), 0 -4px 6px -2px rgba(0, 0, 0, 0.05)' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatDateShort(medicine.givenDate)}
                      </span>
                      <span className={`text-sm font-semibold ${
                        isExpired 
                          ? 'text-green-600' 
                          : remainingDays <= 3 
                            ? 'text-red-600' 
                            : 'text-orange-600'
                      }`}>
                        {isExpired ? 'Süre doldu' : `${remainingDays} gün kaldı`}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {attachments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openAttachmentViewer(attachments)}
                          className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                          title={`${attachments.length} ek görüntüle`}
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                      )}
                      {user && medicine.addedById === user.id && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditClick(medicine)}
                            className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                            title="Düzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(medicine)}
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
                    <span className="text-base font-semibold text-gray-900">
                      {medicine.medicineName}
                    </span>
                    <span className="text-sm text-gray-600">
                      Bekleme: {medicine.waitDays} gün
                    </span>
                  </div>
                  {medicine.note && (
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      <span className="font-semibold">Not:</span> {medicine.note.replace(/\s*\n+\s*/g, ' ').trim()}
                    </p>
                  )}
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">{formatAddedBy(medicine)}</span>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Desktop: Table Layout */}
      {!hasMedicines ? (
        <div className="hidden md:block mt-4">
          <EmptyState
            icon={Pill}
            title="Çıkıcı ilaç kaydı bulunmuyor"
            description="Henüz ilaç kaydı eklenmemiş."
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
                      İlaç Adı
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Bekleme Süresi
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
                <tbody className="divide-y divide-gray-200">
                  {filteredMedicines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                        Seçilen filtrelerde ilaç kaydı bulunamadı
                      </td>
                    </tr>
                  ) : (
                    filteredMedicines.map((medicine, index) => {
                      const isStriped = index % 2 === 1
                      const attachments = getPhotoList(medicine.photoUrl)
                      const remainingDays = calculateRemainingDays(medicine.givenDate, medicine.waitDays)
                      const isExpired = remainingDays === 0
                      const isHighlighted = highlightBannedMedicineId === medicine.id
                      
                      return (
                        <tr
                          key={medicine.id}
                          ref={isHighlighted ? (el) => (highlightedMedicineRowRef.current = el) : undefined}
                          className={`relative transition-colors ${
                            isHighlighted
                              ? 'bg-indigo-50 text-indigo-900 animate-pulse-once'
                              : `${isStriped ? 'bg-gray-50' : 'bg-white'} hover:bg-indigo-50/50`
                          }`}
                        >
                          <td className={`px-4 py-3 whitespace-nowrap ${isHighlighted ? 'border-l-4 border-indigo-400 pl-[0.85rem]' : ''}`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${isHighlighted ? 'text-indigo-900' : 'text-gray-900'}`}>
                                {formatDateShort(medicine.givenDate)}
                              </span>
                              <span className={`text-sm font-semibold ${
                                isExpired 
                                  ? 'text-green-600' 
                                  : remainingDays <= 3 
                                    ? 'text-red-600' 
                                    : 'text-orange-600'
                              }`}>
                                {isExpired ? 'Süre doldu' : `${remainingDays} gün kaldı`}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-800 font-medium">
                              {medicine.medicineName}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-700">
                              {medicine.waitDays} gün
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-800">
                              {medicine.note ? medicine.note.replace(/\s*\n+\s*/g, ' ').trim() : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{formatAddedBy(medicine)}</span>
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
                                  <Paperclip className="h-4 w-4" />
                                </button>
                              )}
                              {user && medicine.addedById === user.id && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditClick(medicine)}
                                    className="p-2 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-sm"
                                    title="Düzenle"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClick(medicine)}
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


      {isEditModalOpen && (
        <AddBannedMedicineModal
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingMedicine(null)
          }}
          horseId={horseId}
          horseName={horseName}
          onSuccess={() => {
            setIsEditModalOpen(false)
            setEditingMedicine(null)
            onRefresh?.()
          }}
          mode={editingMedicine ? 'edit' : 'create'}
          medicineId={editingMedicine?.id}
          initialMedicine={editingMedicine ? {
            medicineName: editingMedicine.medicineName,
            givenDate: editingMedicine.givenDate,
            waitDays: editingMedicine.waitDays,
            note: editingMedicine.note || '',
            photoUrl: editingMedicine.photoUrl,
          } : undefined}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="w-[320px]">
            <DialogHeader>
              <DialogTitle>İlaç Kaydını Sil</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600">
                Bu ilaç kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setMedicineToDelete(null)
                }}
                disabled={isDeleting}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Siliniyor...' : 'Sil'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Attachment Viewer */}
      {attachmentViewer.open && (
        <Dialog open={attachmentViewer.open} onOpenChange={() => setAttachmentViewer({ open: false, attachments: [], currentIndex: 0 })}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-white/95 backdrop-blur-sm border border-gray-200/50 shadow-xl overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-gray-200">
              <DialogTitle className="text-lg font-semibold">Ekler</DialogTitle>
            </DialogHeader>
            <div className="relative flex items-center justify-center p-6 bg-gray-50 min-h-[400px]">
              {attachmentViewer.attachments.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentViewer((prev) => ({
                        ...prev,
                        currentIndex: prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.attachments.length - 1,
                      }))
                    }}
                    className="absolute left-4 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-colors z-10"
                    title="Önceki"
                  >
                    <ChevronLeft className="h-6 w-6 text-gray-700" />
                  </button>
                  <img
                    src={attachmentViewer.attachments[attachmentViewer.currentIndex]}
                    alt={`Attachment ${attachmentViewer.currentIndex + 1}`}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentViewer((prev) => ({
                        ...prev,
                        currentIndex: prev.currentIndex < prev.attachments.length - 1 ? prev.currentIndex + 1 : 0,
                      }))
                    }}
                    className="absolute right-4 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-colors z-10"
                    title="Sonraki"
                  >
                    <ChevronRight className="h-6 w-6 text-gray-700" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                    {attachmentViewer.currentIndex + 1} / {attachmentViewer.attachments.length}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

