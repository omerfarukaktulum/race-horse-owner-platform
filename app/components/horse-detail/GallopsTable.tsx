'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { formatDateShort } from '@/lib/utils/format'
import { formatGallopStatus } from '@/lib/utils/gallops'
import { Filter, X, Plus, Pencil, Trash2, Paperclip, ChevronLeft, ChevronRight, Eye, FileText, NotebookPen } from 'lucide-react'
import { AddGallopNoteModal } from '@/app/components/modals/add-gallop-note-modal'
import { ShowTrainingPlansModal } from '@/app/components/modals/show-training-plans-modal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { useAuth } from '@/lib/context/auth-context'

interface Gallop {
  id: string
  gallopDate: string
  status?: string
  racecourse?: string
  surface?: string
  jockeyName?: string
  distances: any // JSON object with distances
  note?: string | null
  photoUrl?: string | string[] | null
}

type RangeKey = 'lastWeek' | 'lastMonth' | 'last3Months' | 'thisYear'

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'lastWeek', label: 'Son 1 Hafta' },
  { value: 'lastMonth', label: 'Son 1 Ay' },
  { value: 'last3Months', label: 'Son 3 Ay' },
  { value: 'thisYear', label: 'Bu Yıl' },
]

interface Props {
  gallops: Gallop[]
  hideButtons?: boolean
  onFilterTriggerReady?: (trigger: () => void) => void
  showFilterDropdown?: boolean
  onFilterDropdownChange?: (show: boolean) => void
  filterDropdownContainerRef?: React.RefObject<HTMLDivElement>
  onActiveFiltersChange?: (count: number) => void
  highlightGallopId?: string
  onRefresh?: () => void
  horseId?: string
  horseName?: string
}

const normalizeRacecourse = (racecourse?: string) => {
  if (!racecourse) return undefined
  return racecourse.trim()
}

const normalizeStatus = (status?: string) => {
  if (!status) return undefined
  return status.trim()
}

const DISTANCE_OPTIONS = ['200', '400', '600', '800', '1000', '1200', '1400']

export function GallopsTable({ gallops, hideButtons = false, onFilterTriggerReady, showFilterDropdown: externalShowFilterDropdown, onFilterDropdownChange, filterDropdownContainerRef, onActiveFiltersChange, highlightGallopId, onRefresh, horseId, horseName }: Props) {
  const { user } = useAuth()
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [selectedRacecourses, setSelectedRacecourses] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedDistance, setSelectedDistance] = useState<string | null>(null)
  const [internalShowFilterDropdown, setInternalShowFilterDropdown] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null)
  const [selectedGallopForNote, setSelectedGallopForNote] = useState<Gallop | null>(null)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isShowTrainingPlansModalOpen, setIsShowTrainingPlansModalOpen] = useState(false)
  const [attachmentViewer, setAttachmentViewer] = useState<{
    open: boolean
    attachments: string[]
    currentIndex: number
  }>({
    open: false,
    attachments: [],
    currentIndex: 0,
  })
  const [noteViewer, setNoteViewer] = useState<{
    open: boolean
    note: string
    gallopDate: string
  }>({
    open: false,
    note: '',
    gallopDate: '',
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

  // Sort gallops by date (most recent first)
  const sortedGallops = useMemo(() => {
    return [...gallops].sort((a, b) => {
      return new Date(b.gallopDate).getTime() - new Date(a.gallopDate).getTime()
    })
  }, [gallops])

  // Get available distance columns (columns that have at least one non-empty value)
  const availableDistances = useMemo(() => {
    return DISTANCE_OPTIONS.filter((distance) => {
      return sortedGallops.some((gallop) => {
        const distances = typeof gallop.distances === 'object' ? gallop.distances : {}
        const time = distances[distance]
        return time && time !== '-' && String(time).trim() !== ''
      })
    })
  }, [sortedGallops])

  const racecourseOptions = useMemo(() => {
    const racecourses = new Set<string>()
    sortedGallops.forEach((gallop) => {
      const normalized = normalizeRacecourse(gallop.racecourse)
      if (normalized) racecourses.add(normalized)
    })
    return Array.from(racecourses)
  }, [sortedGallops])

  const statusOptions = useMemo(() => {
    const statuses = new Set<string>()
    sortedGallops.forEach((gallop) => {
      const normalized = normalizeStatus(gallop.status)
      if (normalized) statuses.add(normalized)
    })
    return Array.from(statuses)
  }, [sortedGallops])

  // Filter gallops based on selected filters
  const filteredGallops = useMemo(() => {
    let filtered = sortedGallops

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
        filtered = filtered.filter(gallop => {
          const gallopDate = new Date(gallop.gallopDate)
          return gallopDate >= startDate!
        })
      }
    }

    if (selectedRacecourses.length > 0) {
      filtered = filtered.filter((gallop) => {
        const normalized = normalizeRacecourse(gallop.racecourse)
        return normalized ? selectedRacecourses.includes(normalized) : false
      })
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((gallop) => {
        const normalized = normalizeStatus(gallop.status)
        return normalized ? selectedStatuses.includes(normalized) : false
      })
    }

    // Filter by distance - show only gallops that have data for the selected distance
    if (selectedDistance) {
      filtered = filtered.filter((gallop) => {
        const distances = typeof gallop.distances === 'object' ? gallop.distances : {}
        const time = distances[selectedDistance]
        return time && time !== '-' && String(time).trim() !== ''
      })
    }

    return filtered
  }, [sortedGallops, selectedRange, selectedRacecourses, selectedStatuses, selectedDistance])

  const clearFilters = useCallback(() => {
    setSelectedRange(null)
    setSelectedRacecourses([])
    setSelectedStatuses([])
    setSelectedDistance(null)
  }, [])

  const activeFilterCount =
    (selectedRange ? 1 : 0) + selectedRacecourses.length + selectedStatuses.length + (selectedDistance ? 1 : 0)
  const hasActiveFilters = activeFilterCount > 0
  const toggleRacecourse = (racecourse: string) => {
    setSelectedRacecourses((prev) =>
      prev.includes(racecourse) ? prev.filter((r) => r !== racecourse) : [...prev, racecourse]
    )
  }

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  const toggleDistance = (distance: string) => {
    setSelectedDistance((prev) => prev === distance ? null : distance)
  }


  useEffect(() => {
    onActiveFiltersChange?.(activeFilterCount)
  }, [activeFilterCount, onActiveFiltersChange])

  useEffect(() => {
    if (highlightGallopId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightGallopId, filteredGallops.length])

  // Helper function to get attachments from photoUrl
  const getAttachments = useCallback((photoUrl?: string | string[] | null): string[] => {
    if (!photoUrl) return []
    if (Array.isArray(photoUrl)) return photoUrl.filter(Boolean)
    try {
      const parsed = JSON.parse(photoUrl)
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean)
      }
    } catch {
      // ignore parse error, treat as string
    }
    return [photoUrl].filter(Boolean)
  }, [])

  // Open attachment viewer
  const openAttachmentViewer = useCallback((attachments: string[], startIndex: number = 0) => {
    setAttachmentViewer({
      open: true,
      attachments,
      currentIndex: startIndex,
    })
  }, [])

  // Handle add/edit note
  const handleNoteClick = useCallback((gallop: Gallop) => {
    setSelectedGallopForNote(gallop)
    setIsNoteModalOpen(true)
  }, [])

  // Handle note modal success
  const handleNoteSuccess = useCallback(() => {
    onRefresh?.()
  }, [onRefresh])

  // Open note viewer
  const openNoteViewer = useCallback((note: string, gallopDate: string) => {
    setNoteViewer({
      open: true,
      note,
      gallopDate,
    })
  }, [])

  if (gallops.length === 0) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
        <CardContent className="py-16 text-center">
          <p className="text-gray-500">Henüz idman verisi bulunmuyor</p>
        </CardContent>
      </Card>
    )
  }
  
  // Get surface color
  const getSurfaceColor = (surface?: string) => {
    if (!surface) return 'bg-gray-100 text-gray-800'
    
    if (surface.startsWith('Ç:') || surface === 'Ç' || surface === 'Çim') {
      return 'bg-green-100 text-green-800'
    } else if (surface.startsWith('K:') || surface === 'K' || surface === 'Kum') {
      return 'bg-orange-100 text-orange-800'
    } else if (surface.startsWith('S:') || surface === 'S' || surface.toLowerCase().includes('sentetik')) {
      return 'bg-[#d39b1e] text-white'
    }
    return 'bg-gray-100 text-gray-800'
  }
  
  // Format surface display
  const formatSurface = (surface?: string) => {
    if (!surface) return '-'
    if (surface.toLowerCase().includes('sentetik')) return 'Sen'
    return surface
  }
  
  return (
    <>
      {/* Filter dropdown container and Training Plan Button - on same line */}
      <div className="flex flex-row items-center gap-2 mb-4">
        {/* Filter Button */}
        {!hideButtons && (
          <div 
            className="relative filter-dropdown-container"
            ref={filterDropdownRef}
          >
            <Button
              variant="outline"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`border-2 font-medium px-3 h-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 whitespace-nowrap ${
                hasActiveFilters
                  ? 'border-[#6366f1] bg-indigo-50 text-[#6366f1]'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#6366f1] text-white text-xs font-semibold">
                  1
                </span>
              )}
            </Button>

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

              {racecourseOptions.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Hipodrom</label>
                  <div className="flex flex-wrap gap-2">
                    {racecourseOptions.map((racecourse) => {
                      const isActive = selectedRacecourses.includes(racecourse)
                      return (
                        <button
                          key={racecourse}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRacecourse(racecourse)
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-[#6366f1] text-white shadow'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {racecourse}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {statusOptions.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Durum</label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((status) => {
                      const isActive = selectedStatuses.includes(status)
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleStatus(status)
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-[#6366f1] text-white shadow'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {formatGallopStatus(status)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Distance Filter */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Mesafe</label>
                <div className="flex flex-wrap gap-2">
                  {DISTANCE_OPTIONS.map((distance) => {
                    const isActive = selectedDistance === distance
                    return (
                      <button
                        key={distance}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleDistance(distance)
                        }}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[#6366f1] text-white shadow'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {distance}m
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

          // Render dropdown in portal if hideButtons is true, otherwise inline
          if (hideButtons && filterDropdownContainerRef?.current) {
            return createPortal(dropdownContent, filterDropdownContainerRef.current)
          }
          
          return dropdownContent
        })()}
          </div>
        )}

        {/* Training Plan Button - only visible when hideButtons is false */}
        {!hideButtons && horseId && horseName && (
          <Button
            variant="outline"
            onClick={() => setIsShowTrainingPlansModalOpen(true)}
            className="border-2 font-medium px-3 sm:px-4 h-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-gray-300 text-gray-700 hover:border-gray-400 whitespace-nowrap"
          >
            <NotebookPen className="h-4 w-4 mr-2" />
            İdman Planı
          </Button>
        )}
      </div>

    <div>
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Hipodrom
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Jokey
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Pist
                  </th>
                  {availableDistances.map((distance) => {
                    const isActive = selectedDistance === distance
                    const isVisible = !selectedDistance || selectedDistance === distance
                    return (
                      <th
                        key={distance}
                        onClick={() => toggleDistance(distance)}
                        className={`px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors select-none ${
                          isActive
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            : 'text-gray-700 hover:bg-gray-100'
                        } ${!isVisible ? 'hidden' : ''}`}
                        title={`${distance}m filtrele`}
                      >
                        {distance}m
                      </th>
                    )
                  })}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    İdman Notu
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGallops.length === 0 ? (
                  <tr>
                    <td colSpan={availableDistances.length + 6} className="px-4 py-6 text-center text-sm text-gray-500">
                      Seçilen filtrelerde idman bulunamadı
                    </td>
                  </tr>
                ) : (
                  filteredGallops.map((gallop, index) => {
                  const isStriped = index % 2 === 1
                  const isHighlighted = highlightGallopId === gallop.id
                  const distances = typeof gallop.distances === 'object' ? gallop.distances : {}
                  
                  // Get specific distance times
                  const getDistance = (meter: string) => {
                    const time = distances[meter]
                    if (!time) return '-'
                    
                    // Remove "0." prefix if present (e.g., "0.25.80" → "25.80")
                    const timeStr = String(time)
                    if (timeStr.startsWith('0.')) {
                      return timeStr.substring(2)
                    }
                    return timeStr
                  }
                  
                  const statusLabel = formatGallopStatus(gallop.status)
                  return (
                    <tr
                      key={gallop.id}
                      ref={isHighlighted ? (el) => (highlightedRowRef.current = el) : undefined}
                      className={`relative transition-colors ${
                        isHighlighted
                          ? 'bg-indigo-50 text-indigo-900 animate-pulse-once'
                          : `${isStriped ? 'bg-gray-50/30' : 'bg-white'} hover:bg-indigo-50/50`
                      }`}
                    >
                      {/* Date */}
                      <td className={`px-4 py-3 whitespace-nowrap ${isHighlighted ? 'border-l-4 border-indigo-400 pl-[0.85rem]' : ''}`}>
                        <span className={`text-sm font-medium ${isHighlighted ? 'text-indigo-900' : 'text-gray-900'}`}>
                          {formatDateShort(gallop.gallopDate)}
                        </span>
                      </td>
                      
                      {/* Racecourse */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{gallop.racecourse || '-'}</span>
                      </td>
                      
                      {/* Jockey */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{gallop.jockeyName || '-'}</span>
                      </td>
                      
                      {/* Surface */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {gallop.surface && (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSurfaceColor(gallop.surface)}`}>
                            {formatSurface(gallop.surface)}
                          </span>
                        )}
                      </td>
                      
                      {availableDistances.map((meter) => {
                        const isVisible = !selectedDistance || selectedDistance === meter
                        return (
                          <td key={meter} className={`px-3 py-3 text-center ${!isVisible ? 'hidden' : ''}`}>
                            <span className="text-sm font-medium text-gray-800">{getDistance(meter)}</span>
                          </td>
                        )
                      })}
                      
                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{statusLabel || '-'}</span>
                      </td>
                      
                      {/* İdman Notu */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {gallop.note || gallop.photoUrl ? (
                          <div className="flex justify-start gap-2">
                            {(() => {
                              const attachments = getAttachments(gallop.photoUrl)
                              return (
                                <>
                                  {gallop.note && (
                                    <button
                                      type="button"
                                      onClick={() => openNoteViewer(gallop.note!, gallop.gallopDate)}
                                      className="p-2 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-sm"
                                      title="Notu görüntüle"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  )}
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
                                    onClick={() => handleNoteClick(gallop)}
                                    className="p-2 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-sm"
                                    title="Düzenle"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </>
                              )
                            })()}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleNoteClick(gallop)}
                            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                            title="İdman notu ekle"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Ekle</span>
                          </button>
                        )}
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
    </div>

    {/* Note Modal */}
    {selectedGallopForNote && (
      <AddGallopNoteModal
        open={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false)
          setSelectedGallopForNote(null)
        }}
        gallopId={selectedGallopForNote.id}
        gallopDate={selectedGallopForNote.gallopDate}
        initialNote={selectedGallopForNote.note}
        initialPhotoUrl={selectedGallopForNote.photoUrl}
        onSuccess={handleNoteSuccess}
      />
    )}

    {/* Note Viewer */}
    {noteViewer.open && (
      <Dialog open={noteViewer.open} onOpenChange={() => setNoteViewer({ open: false, note: '', gallopDate: '' })}>
        <DialogContent className="w-[320px] max-h-[90vh] p-0 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div className="text-center">
                <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                  İdman Notu
                </DialogTitle>
                <div className="text-sm text-gray-600 mt-2">
                  <p>
                    <span className="font-semibold">Tarih:</span> {formatDateShort(noteViewer.gallopDate)}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{noteViewer.note}</p>
            </div>
          </div>
          <div className="flex justify-end px-6 py-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNoteViewer({ open: false, note: '', gallopDate: '' })}
            >
              Kapat
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

    {/* Training Plan Modal */}
    {horseId && horseName && (
      <ShowTrainingPlansModal
        open={isShowTrainingPlansModalOpen}
        onClose={() => setIsShowTrainingPlansModalOpen(false)}
        horseId={horseId}
        horseName={horseName}
        onRefresh={onRefresh}
      />
    )}
    </>
  )
}

