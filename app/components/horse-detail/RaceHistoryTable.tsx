'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { formatDateShort, formatCurrency } from '@/lib/utils/format'
import { abbreviateRaceType } from '@/lib/utils/chart-data'
import { formatGallopStatus } from '@/lib/utils/gallops'
import { Video, Image as ImageIcon, Medal, Filter, X, Activity } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'

interface RaceHistory {
  id: string
  raceDate: string
  city?: string
  distance?: number
  surface?: string
  surfaceType?: string
  position?: number
  derece?: string
  weight?: string
  jockeyName?: string
  raceNumber?: number
  raceName?: string
  raceType?: string
  trainerName?: string
  handicapPoints?: number
  prizeMoney?: string
  videoUrl?: string
  photoUrl?: string
}

interface Gallop {
  id: string
  gallopDate: string
  status?: string
  racecourse?: string
  surface?: string
  jockeyName?: string
  distances: any
}

type RangeKey = 'lastWeek' | 'lastMonth' | 'last3Months' | 'thisYear'

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'lastWeek', label: 'Son 1 Hafta' },
  { value: 'lastMonth', label: 'Son 1 Ay' },
  { value: 'last3Months', label: 'Son 3 Ay' },
  { value: 'thisYear', label: 'Bu Yıl' },
]

interface Props {
  races: RaceHistory[]
  gallops?: Gallop[]
  hideButtons?: boolean
  onFilterTriggerReady?: (trigger: () => void) => void
  showFilterDropdown?: boolean
  onFilterDropdownChange?: (show: boolean) => void
  filterDropdownContainerRef?: React.RefObject<HTMLDivElement>
  onActiveFiltersChange?: (count: number) => void
  highlightRaceId?: string
}

const DISTANCE_GROUPS = [
  { value: 'short', label: 'Kısa Mesafe', description: '800-1400m' },
  { value: 'medium', label: 'Orta Mesafe', description: '1401-1900m' },
  { value: 'long', label: 'Uzun Mesafe', description: '1900m+' },
]

const normalizeSurface = (surface?: string) => {
  if (!surface) return undefined
  if (surface.startsWith('Ç')) return 'Çim'
  if (surface.startsWith('K')) return 'Kum'
  if (surface.startsWith('S')) return 'Sentetik'
  return surface
}

const getDistanceGroup = (distance?: number) => {
  if (!distance) return undefined
  if (distance >= 800 && distance <= 1400) return 'short'
  if (distance > 1400 && distance <= 1900) return 'medium'
  if (distance > 1900) return 'long'
  return undefined
}

export function RaceHistoryTable({ races, gallops = [], hideButtons = false, onFilterTriggerReady, showFilterDropdown: externalShowFilterDropdown, onFilterDropdownChange, filterDropdownContainerRef, onActiveFiltersChange, highlightRaceId }: Props) {
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([])
  const [selectedDistanceGroups, setSelectedDistanceGroups] = useState<string[]>([])
  const [selectedResults, setSelectedResults] = useState<string[]>([])
  const [selectedRacecourses, setSelectedRacecourses] = useState<string[]>([])
  const [internalShowFilterDropdown, setInternalShowFilterDropdown] = useState(false)
  const [selectedRaceForGallops, setSelectedRaceForGallops] = useState<RaceHistory | null>(null)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)
  const highlightedRaceRowRef = useRef<HTMLTableRowElement | null>(null)
  
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

  // Sort races by date (most recent first)
  const sortedRaces = useMemo(() => {
    return [...races].sort((a, b) => {
      return new Date(b.raceDate).getTime() - new Date(a.raceDate).getTime()
    })
  }, [races])

  const surfaceOptions = useMemo(() => {
    const surfaces = new Set<string>()
    sortedRaces.forEach((race) => {
      const normalized = normalizeSurface(race.surface)
      if (normalized) surfaces.add(normalized)
    })
    return Array.from(surfaces)
  }, [sortedRaces])

  const racecourseOptions = useMemo(() => {
    const racecourses = new Set<string>()
    sortedRaces.forEach((race) => {
      if (race.city) racecourses.add(race.city)
    })
    return Array.from(racecourses).sort()
  }, [sortedRaces])

  // Filter races based on selected filters
  const filteredRaces = useMemo(() => {
    let filtered = sortedRaces

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
        filtered = filtered.filter(race => {
        const raceDate = new Date(race.raceDate)
        return raceDate >= startDate!
      })
    }
    }

    if (selectedSurfaces.length > 0) {
      filtered = filtered.filter((race) => {
        const normalized = normalizeSurface(race.surface)
        return normalized ? selectedSurfaces.includes(normalized) : false
      })
    }

    if (selectedRacecourses.length > 0) {
      filtered = filtered.filter((race) => {
        return race.city ? selectedRacecourses.includes(race.city) : false
      })
    }

    if (selectedDistanceGroups.length > 0) {
      filtered = filtered.filter((race) => {
        const group = getDistanceGroup(race.distance)
        return group ? selectedDistanceGroups.includes(group) : false
      })
    }

    // Filter by results
    if (selectedResults.length > 0) {
      filtered = filtered.filter((race) => {
        if (!race.position) return false
        
        // Check if race matches any selected result filter (OR logic)
        if (selectedResults.includes('ilk-3') && race.position >= 1 && race.position <= 3) {
          return true
        }
        if (selectedResults.includes('tabela-disi') && race.position > 5) {
          return true
        }
        if (selectedResults.includes('tabela-sonu') && (race.position === 4 || race.position === 5)) {
          return true
        }
        return false
      })
    }

    return filtered
  }, [sortedRaces, selectedRange, selectedSurfaces, selectedRacecourses, selectedDistanceGroups, selectedResults])

  const clearFilters = useCallback(() => {
    setSelectedRange(null)
    setSelectedSurfaces([])
    setSelectedRacecourses([])
    setSelectedDistanceGroups([])
    setSelectedResults([])
  }, [])

  const activeFilterCount =
    (selectedRange ? 1 : 0) + selectedSurfaces.length + selectedRacecourses.length + selectedDistanceGroups.length + selectedResults.length
  const hasActiveFilters = activeFilterCount > 0

  useEffect(() => {
    onActiveFiltersChange?.(activeFilterCount)
  }, [activeFilterCount, onActiveFiltersChange])

  const toggleSurface = (surface: string) => {
    setSelectedSurfaces((prev) =>
      prev.includes(surface) ? prev.filter((s) => s !== surface) : [...prev, surface]
    )
  }

  const toggleDistanceGroup = (group: string) => {
    setSelectedDistanceGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    )
  }

  const toggleRacecourse = (racecourse: string) => {
    setSelectedRacecourses((prev) =>
      prev.includes(racecourse) ? prev.filter((r) => r !== racecourse) : [...prev, racecourse]
    )
  }

  const toggleResult = (result: string) => {
    setSelectedResults((prev) =>
      prev.includes(result) ? prev.filter((r) => r !== result) : [...prev, result]
    )
  }

  useEffect(() => {
    if (highlightRaceId && highlightedRaceRowRef.current) {
      highlightedRaceRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightRaceId, filteredRaces.length])

  if (races.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#6366f1] to-[#4f46e5] bg-clip-text text-transparent">
          Koşu Geçmişi
        </h2>
        <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
          <CardContent className="py-16 text-center">
            <p className="text-gray-500">Henüz koşu geçmişi bulunmuyor</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Get surface color using official colors
  const getSurfaceColor = (surface?: string) => {
    if (!surface) return { backgroundColor: '#f3f4f6', color: '#374151' }
    
    if (surface.startsWith('Ç:') || surface === 'Ç' || surface === 'Çim') {
      return { backgroundColor: '#009900', color: '#ffffff' } // Official Çim color
    } else if (surface.startsWith('K:') || surface === 'K' || surface === 'Kum') {
      return { backgroundColor: '#996633', color: '#ffffff' } // Official Kum color
    } else if (surface.startsWith('S:') || surface === 'S' || surface.toLowerCase().includes('sentetik')) {
      return { backgroundColor: '#d39b1e', color: '#ffffff' } // Official Sentetik color
    }
    return { backgroundColor: '#f3f4f6', color: '#374151' }
  }
  
  // Format surface display
  const formatSurface = (surface?: string) => {
    if (!surface) return '-'
    if (surface.toLowerCase().includes('sentetik')) return 'Sen'
    if (surface.startsWith('S:') || surface === 'S') return 'Sen'
    return surface
  }
  
  // Get position medal
  const getPositionMedal = (position?: number) => {
    if (position === 1) return '🥇'
    if (position === 2) return '🥈'
    if (position === 3) return '🥉'
    return null
  }
  
  // Build TJK details URL
  const getTJKDetailsUrl = (race: RaceHistory) => {
    if (!race.videoUrl) return null
    
    // Extract race code from video URL (KosuKodu parameter)
    const match = race.videoUrl.match(/KosuKodu=(\d+)/)
    if (!match) return null
    
    const raceCode = match[1]
    const raceDate = new Date(race.raceDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    raceDate.setHours(0, 0, 0, 0)
    
    // Determine era
    let era = 'past'
    if (raceDate.getTime() === today.getTime()) {
      era = 'today'
    } else if (raceDate.getTime() > today.getTime()) {
      era = 'future'
    }
    
    // Format date as DD/MM/YYYY
    const day = String(raceDate.getDate()).padStart(2, '0')
    const month = String(raceDate.getMonth() + 1).padStart(2, '0')
    const year = raceDate.getFullYear()
    const formattedDate = `${day}/${month}/${year}`
    
    return `https://www.tjk.org/TR/YarisSever/Info/Page/GunlukYarisSonuclari?QueryParameter_Tarih=${formattedDate}&Era=${era}#${raceCode}`
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
            className={`border-2 font-medium px-3 h-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
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

              {/* Racecourse Filter */}
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

              {/* Result Filter */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Sonuç</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'ilk-3', label: 'İlk 3 Sıra' },
                    { value: 'tabela-sonu', label: 'Tabela Sonu' },
                    { value: 'tabela-disi', label: 'Tabela Dışı' },
                  ].map((option) => {
                    const isActive = selectedResults.includes(option.value)
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleResult(option.value)
                        }}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[#6366f1] text-white shadow'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {surfaceOptions.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Pist Türü</label>
                  <div className="flex flex-wrap gap-2">
                    {surfaceOptions.map((surface) => {
                      const isActive = selectedSurfaces.includes(surface)
                      return (
                        <button
                          key={surface}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSurface(surface)
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-[#6366f1] text-white shadow'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {surface}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Mesafe</label>
                <div className="flex flex-wrap gap-2">
                  {DISTANCE_GROUPS.map((group) => {
                    const isActive = selectedDistanceGroups.includes(group.value)
                    return (
                      <button
                        key={group.value}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleDistanceGroup(group.value)
                        }}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[#6366f1] text-white shadow'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={group.description}
                      >
                        {group.label}
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

    {/* Mobile: Card Layout */}
    <div className="md:hidden">
      {filteredRaces.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-gray-500">
          Seçilen filtrelerde koşu bulunamadı
        </div>
      ) : (
        <>
          {filteredRaces.map((race, index) => {
            const medal = getPositionMedal(race.position)
            const isHighlighted = highlightRaceId === race.id
            
            return (
              <div
                key={race.id}
                data-race-id={race.id}
                ref={isHighlighted ? (el) => { highlightedRaceRowRef.current = el as any } : undefined}
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
                      {formatDateShort(race.raceDate)}
                    </span>
                    {race.city && (
                      <span className="text-sm text-gray-700">
                        {race.city}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {medal && <span className="text-lg">{medal}</span>}
                              <span className="text-sm text-gray-600">Sıra:</span>
                    <span className={`text-sm font-bold ${race.position && race.position <= 3 ? 'text-indigo-600' : 'text-gray-900'}`}>
                      {race.position || '-'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {race.raceType && (
                      <span className="px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-medium flex-shrink-0">
                        {abbreviateRaceType(race.raceType)}
                      </span>
                    )}
                    {race.distance && (
                      <span 
                        className="px-2 py-1 rounded-md text-xs font-medium flex-shrink-0"
                        style={race.surface ? getSurfaceColor(race.surface) : { backgroundColor: '#f3f4f6', color: '#374151' }}
                      >
                        {race.distance}m
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {race.derece && (
                      <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                        {race.derece}
                      </span>
                    )}
                    {race.photoUrl && (
                      <a
                        href={race.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors flex-shrink-0"
                        title="Foto"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
                
                {race.jockeyName && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-700">
                      {race.jockeyName}
                    </span>
                    {race.prizeMoney && parseFloat(race.prizeMoney) > 0 && (
                      <span className="text-sm font-bold text-green-600">
                        {formatCurrency(race.prizeMoney)}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-end mb-2">
                  <div className="flex items-center gap-1">
                    {getTJKDetailsUrl(race) && (
                      <a
                        href={getTJKDetailsUrl(race)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        title="Koşu Detayları"
                      >
                        <span className="text-xs font-medium">Details</span>
                      </a>
                    )}
                    {race.videoUrl && (
                      <a
                        href={race.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                        title="Koşu detayları"
                      >
                        <Video className="h-4 w-4" />
                        <span className="text-xs font-medium">Koşu detayları</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedRaceForGallops(race)}
                      className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors text-xs font-medium flex items-center gap-1"
                      title="Koşu İdmanları"
                    >
                      <Activity className="h-4 w-4" />
                      Koşu öncesi idmanlar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>

    {/* Desktop: Table Layout */}
    <div className="hidden md:block">
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
                    Şehir
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Koşu Türü
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Mesafe
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Pist
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Sıra
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Derece
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Jokey
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    İkramiye
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Medya
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Koşu İdmanları
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRaces.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-6 text-center text-sm text-gray-500">
                      Seçilen filtrelerde koşu bulunamadı
                    </td>
                  </tr>
                ) : (
                  filteredRaces.map((race, index) => {
                  const medal = getPositionMedal(race.position)
                  const isStriped = index % 2 === 1
                  const isHighlighted = highlightRaceId === race.id
                  
                  return (
                    <tr
                      key={race.id}
                      ref={isHighlighted ? (el) => { highlightedRaceRowRef.current = el } : undefined}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-indigo-50 text-indigo-900 animate-pulse-once'
                          : `${isStriped ? 'bg-gray-50/30' : 'bg-white'} hover:bg-indigo-50/50`
                      }`}
                    >
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {formatDateShort(race.raceDate)}
                        </span>
                      </td>
                      
                      {/* City */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{race.city || '-'}</span>
                      </td>
                      
                      {/* Race Type - Moved here */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {race.raceType && (
                          <span className="px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-medium">
                            {abbreviateRaceType(race.raceType)}
                          </span>
                        )}
                      </td>
                      
                      {/* Distance - Removed 'm' */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {race.distance || '-'}
                        </span>
                      </td>
                      
                      {/* Surface */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {race.surface && (
                          <span 
                            className="px-2 py-1 rounded-full text-xs font-semibold"
                            style={getSurfaceColor(race.surface)}
                          >
                            {formatSurface(race.surface)}
                          </span>
                        )}
                      </td>
                      
                      {/* Position */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          {medal && <span className="text-lg">{medal}</span>}
                          <span className={`text-sm font-bold ${race.position && race.position <= 3 ? 'text-indigo-600' : 'text-gray-900'}`}>
                            {race.position || '-'}
                          </span>
                        </div>
                      </td>
                      
                      {/* Derece (Time) - Matching mesafe font */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {race.derece || '-'}
                        </span>
                      </td>
                      
                      {/* Jockey */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{race.jockeyName || '-'}</span>
                      </td>
                      
                      {/* Prize Money */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {race.prizeMoney && parseFloat(race.prizeMoney) > 0 ? (
                          <span className="text-sm font-bold text-green-600">
                            {formatCurrency(race.prizeMoney)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      
                      {/* Media Links */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getTJKDetailsUrl(race) ? (
                            <a
                              href={getTJKDetailsUrl(race)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 transition-colors text-xs font-medium underline"
                              title="Koşu Detayları"
                            >
                              Details
                            </a>
                          ) : null}
                          {race.videoUrl ? (
                            <a
                              href={race.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 transition-colors"
                              title="Video"
                            >
                              <Video className="h-4 w-4" />
                            </a>
                          ) : null}
                          {race.photoUrl ? (
                            <a
                              href={race.photoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-800 transition-colors"
                              title="Foto"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </a>
                          ) : null}
                          {!getTJKDetailsUrl(race) && !race.videoUrl && !race.photoUrl && (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      
                      {/* Koşu İdmanları */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRaceForGallops(race)}
                          className="h-8 w-8 p-0 hover:bg-indigo-50"
                          title="Koşu İdmanları"
                        >
                          <Activity className="h-4 w-4 text-indigo-600" />
                        </Button>
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

    {/* Gallops Modal */}
    {selectedRaceForGallops && (
      <RaceGallopsModal
        race={selectedRaceForGallops}
        races={sortedRaces}
        gallops={gallops}
        onClose={() => setSelectedRaceForGallops(null)}
      />
    )}
    </>
  )
}

// Modal component for showing gallops between races
function RaceGallopsModal({ 
  race, 
  races, 
  gallops, 
  onClose 
}: { 
  race: RaceHistory
  races: RaceHistory[]
  gallops: Gallop[]
  onClose: () => void
}) {
  const [selectedDistance, setSelectedDistance] = useState<string | null>(null)
  const DISTANCE_OPTIONS = ['200', '400', '600', '800', '1000', '1200', '1400']

  // Find previous race
  const previousRace = useMemo(() => {
    const currentRaceDate = new Date(race.raceDate)
    const previousRaces = races
      .filter(r => new Date(r.raceDate) < currentRaceDate)
      .sort((a, b) => new Date(b.raceDate).getTime() - new Date(a.raceDate).getTime())
    return previousRaces[0] || null
  }, [race, races])

  // Filter gallops between previous race and current race
  const filteredGallops = useMemo(() => {
    const currentRaceDate = new Date(race.raceDate)
    const previousRaceDate = previousRace ? new Date(previousRace.raceDate) : null
    
    let filtered = gallops.filter((gallop) => {
      const gallopDate = new Date(gallop.gallopDate)
      // Include gallops that are:
      // - After previous race (or from beginning if no previous race)
      // - Before or on current race date
      if (previousRaceDate) {
        return gallopDate > previousRaceDate && gallopDate <= currentRaceDate
      }
      return gallopDate <= currentRaceDate
    })

    // Filter by selected distance if any
    if (selectedDistance) {
      filtered = filtered.filter((gallop) => {
        const distances = typeof gallop.distances === 'object' ? gallop.distances : {}
        const time = distances[selectedDistance]
        return time && time !== '-' && String(time).trim() !== ''
      })
    }

    return filtered.sort((a, b) => new Date(b.gallopDate).getTime() - new Date(a.gallopDate).getTime())
  }, [race, previousRace, gallops, selectedDistance])

  // Get available distance columns (columns that have at least one non-empty value)
  const availableDistances = useMemo(() => {
    return DISTANCE_OPTIONS.filter((distance) => {
      return filteredGallops.some((gallop) => {
        const distances = typeof gallop.distances === 'object' ? gallop.distances : {}
        const time = distances[distance]
        return time && time !== '-' && String(time).trim() !== ''
      })
    })
  }, [filteredGallops])

  const toggleDistance = (distance: string) => {
    setSelectedDistance((prev) => prev === distance ? null : distance)
  }

  // Get surface color (same as in GallopsTable)
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

  // Get distance value
  const getDistance = (distances: any, meter: string) => {
    const time = distances[meter]
    if (!time) return '-'
    
    const timeStr = String(time)
    if (timeStr.startsWith('0.')) {
      return timeStr.substring(2)
    }
    return timeStr
  }

  // Calculate days before race
  const getDaysBeforeRace = (gallopDate: string) => {
    const raceDate = new Date(race.raceDate)
    const gallop = new Date(gallopDate)
    
    // Set both dates to midnight for accurate day calculation
    raceDate.setHours(0, 0, 0, 0)
    gallop.setHours(0, 0, 0, 0)
    
    const diffTime = raceDate.getTime() - gallop.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return 'Aynı gün'
    } else if (diffDays === 1) {
      return '1 gün önce'
    } else if (diffDays > 0) {
      return `${diffDays} gün önce`
    } else {
      // If gallop is after race (shouldn't happen, but handle it)
      return `${Math.abs(diffDays)} gün sonra`
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-7xl max-h-[90vh] p-0 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <Activity className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                Koşu İdmanları
              </DialogTitle>
              <div className="text-sm text-gray-600 mt-2 space-y-1 inline-block text-left">
                {previousRace && (() => {
                  const previousRaceDate = new Date(previousRace.raceDate)
                  const currentRaceDate = new Date(race.raceDate)
                  const diffTime = currentRaceDate.getTime() - previousRaceDate.getTime()
                  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                  return (
                    <p>
                      <span className="font-semibold">Toplam {filteredGallops.length} idman {diffDays} gün içerisinde</span>
                    </p>
                  )
                })()}
                {!previousRace && (
                  <p>
                    <span className="font-semibold">Total {filteredGallops.length} idman</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col min-w-0 w-full">
          <div className="flex flex-col w-full">
            {/* Mobile: Card Layout */}
            <div className="md:hidden mb-4 flex justify-center w-full px-6">
              <div className="w-full">
                <div 
                  className="overflow-y-auto overflow-x-hidden px-2 py-2"
                  style={{ maxHeight: 'calc(90vh - 300px)' }}
                >
                {filteredGallops.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Activity className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 text-lg">Bu koşu için idman verisi bulunmuyor</p>
                  </div>
                ) : (
                  filteredGallops.map((gallop) => {
                    const distances = typeof gallop.distances === 'object' ? gallop.distances : {}
                    const statusLabel = formatGallopStatus(gallop.status)
                    
                    // Get available distances for this gallop
                    const availableDistancesForGallop = availableDistances.filter(
                      (meter) => {
                        const time = distances[meter]
                        return time && time !== '-' && String(time).trim() !== ''
                      }
                    )
                    
                    return (
                      <div
                        key={gallop.id}
                        className="bg-indigo-50/30 border-0 p-4 mb-3 rounded-lg w-full box-border"
                        style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 -10px 15px -3px rgba(0, 0, 0, 0.1), 0 -4px 6px -2px rgba(0, 0, 0, 0.05)' }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatDateShort(gallop.gallopDate)}
                            </span>
                            {gallop.racecourse && (
                              <span className="text-sm text-gray-700">
                                {gallop.racecourse}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-600 font-medium">
                            {getDaysBeforeRace(gallop.gallopDate)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {gallop.jockeyName && (
                              <span className="text-sm text-gray-700">
                                {gallop.jockeyName}
                              </span>
                            )}
                            {gallop.surface && (
                              <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getSurfaceColor(gallop.surface)}`}>
                                {formatSurface(gallop.surface)}
                              </span>
                            )}
                          </div>
                          {statusLabel && (
                            <span className="text-sm text-gray-700">
                              {statusLabel}
                            </span>
                          )}
                        </div>
                        
                        {availableDistancesForGallop.length > 0 && (
                          <div className="mb-2">
                            <div className="flex flex-wrap gap-2">
                              {availableDistancesForGallop.map((meter) => (
                                <div key={meter} className="flex items-center gap-1">
                                  <span className="text-xs font-medium text-gray-600">{meter}m:</span>
                                  <span className="px-2 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800">
                                    {getDistance(distances, meter)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Desktop: Table Layout */}
          <div className="hidden md:flex flex-1 flex-col min-h-0 w-full">
            {filteredGallops.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center px-6">
                <Activity className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">Bu koşu için idman verisi bulunmuyor</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto px-6 py-4">
                <table className="w-full min-w-max">
                  <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Tarih
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Zamanlama
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredGallops.map((gallop, index) => {
                      const isStriped = index % 2 === 1
                      const distances = typeof gallop.distances === 'object' ? gallop.distances : {}
                      const statusLabel = formatGallopStatus(gallop.status)
                      
                      return (
                        <tr
                          key={gallop.id}
                          className={`transition-colors ${
                            isStriped ? 'bg-gray-50' : 'bg-white'
                          } hover:bg-indigo-50/50`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {formatDateShort(gallop.gallopDate)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-600 font-medium">
                              {getDaysBeforeRace(gallop.gallopDate)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-700">{gallop.racecourse || '-'}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-700">{gallop.jockeyName || '-'}</span>
                          </td>
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
                                <span className="text-sm font-medium text-gray-800">{getDistance(distances, meter)}</span>
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-700">{statusLabel || '-'}</span>
                          </td>
                        </tr>
                      )
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

