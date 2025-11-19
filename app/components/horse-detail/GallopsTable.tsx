'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { formatDateShort } from '@/lib/utils/format'
import { formatGallopStatus } from '@/lib/utils/gallops'
import { Filter, X } from 'lucide-react'

interface Gallop {
  id: string
  gallopDate: string
  status?: string
  racecourse?: string
  surface?: string
  jockeyName?: string
  distances: any // JSON object with distances
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
}

const normalizeRacecourse = (racecourse?: string) => {
  if (!racecourse) return undefined
  return racecourse.trim()
}

const normalizeStatus = (status?: string) => {
  if (!status) return undefined
  return status.trim()
}

export function GallopsTable({ gallops, hideButtons = false, onFilterTriggerReady, showFilterDropdown: externalShowFilterDropdown, onFilterDropdownChange, filterDropdownContainerRef, onActiveFiltersChange, highlightGallopId }: Props) {
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [selectedRacecourses, setSelectedRacecourses] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [internalShowFilterDropdown, setInternalShowFilterDropdown] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null)
  
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

    return filtered
  }, [sortedGallops, selectedRange, selectedRacecourses, selectedStatuses])

  const clearFilters = useCallback(() => {
    setSelectedRange(null)
    setSelectedRacecourses([])
    setSelectedStatuses([])
  }, [])

  const activeFilterCount =
    (selectedRange ? 1 : 0) + selectedRacecourses.length + selectedStatuses.length
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


  useEffect(() => {
    onActiveFiltersChange?.(activeFilterCount)
  }, [activeFilterCount, onActiveFiltersChange])

  useEffect(() => {
    if (highlightGallopId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightGallopId, filteredGallops.length])

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
                1
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
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    200m
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    400m
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    600m
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    800m
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    1000m
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    1200m
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    1400m
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGallops.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-6 text-center text-sm text-gray-500">
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
                      
                      {['200','400','600','800','1000','1200','1400'].map((meter) => (
                        <td key={meter} className="px-3 py-3 text-center">
                          <span className="text-sm font-medium text-gray-800">{getDistance(meter)}</span>
                        </td>
                      ))}
                      
                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{statusLabel || '-'}</span>
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
    </>
  )
}

