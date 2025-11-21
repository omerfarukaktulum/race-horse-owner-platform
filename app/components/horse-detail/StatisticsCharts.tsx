'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { MapPin, Ruler, Layers, Users, TurkishLira, Flag, Filter, X, Trophy, ChevronDown, BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import { TR } from '@/lib/constants/tr'
import { useAuth } from '@/lib/context/auth-context'
import {
  getCityDistribution,
  getSurfaceDistribution,
  getRaceTypeDistribution,
  getJockeyDistribution,
  getExpensesTrend,
  getSurfacePerformanceData,
  getCityPerformanceData,
  getJockeyPerformanceData,
  getDistancePerformanceData,
} from '@/lib/utils/chart-data'

interface RaceHistory {
  id: string
  raceDate: string
  city?: string
  distance?: number
  surface?: string
  jockeyName?: string
  prizeMoney?: string
  raceType?: string
  position?: number
  horseId?: string
  horseName?: string
  horse?: {
    id: string
    name: string
    stablemate?: {
      id: string
      name: string
    } | null
  }
}

interface ExpenseData {
  date: string
  amount: string
  horseId?: string
  horseName?: string
  category?: string
  horse?: {
    id: string
    name: string
    stablemate?: {
      id: string
      name: string
    } | null
  }
}

interface NoteData {
  id: string
  date: string
  category: string
  kiloValue?: number | null
  horseId?: string
}

type RangeKey = 'lastWeek' | 'lastMonth' | 'last3Months' | 'last6Months' | 'thisYear'

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'lastWeek', label: 'Son 1 Hafta' },
  { value: 'lastMonth', label: 'Son 1 Ay' },
  { value: 'last3Months', label: 'Son 3 Ay' },
  { value: 'last6Months', label: 'Son 6 Ay' },
  { value: 'thisYear', label: 'Bu Yıl' },
]

interface Props {
  races: RaceHistory[]
  expenses: ExpenseData[]
  notes?: NoteData[]
  hideButtons?: boolean
  onFilterTriggerReady?: (trigger: () => void) => void
  showFilterDropdown?: boolean
  onFilterDropdownChange?: (show: boolean) => void
  filterDropdownContainerRef?: React.RefObject<HTMLDivElement>
  isGlobalStats?: boolean
  onActiveFiltersChange?: (count: number) => void
  showExpenseCategoryDistribution?: boolean
}

// Distinct color palette for charts (vibrant colors)
const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f97316', // Orange
  '#06b6d4', // Cyan
]
const MAX_CATEGORY_CHARTS = 6

const formatCurrencyNumber = (value: number) =>
  new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))

const addPercentages = <T extends { value: number }>(data: T[]): Array<T & { percent: number; total: number }> => {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0)
  return data.map((item) => ({
    ...item,
    percent: total > 0 ? (item.value / total) * 100 : 0,
    total: total, // Add total for tooltip calculation
  }))
}

const DISTANCE_GROUP_DEFS = [
  { id: 'short', label: 'Kısa Mesafe', min: 800, max: 1400 },
  { id: 'medium', label: 'Orta Mesafe', min: 1401, max: 1900 },
  { id: 'long', label: 'Uzun Mesafe', min: 1901, max: Number.POSITIVE_INFINITY },
] as const

const getDistanceGroupId = (distance?: number) => {
  if (!distance) return undefined
  if (distance >= 800 && distance <= 1400) return 'short'
  if (distance > 1400 && distance <= 1900) return 'medium'
  if (distance > 1900) return 'long'
  return undefined
}

const getNormalizedString = (value?: string) => value?.toUpperCase().trim() || ''

// Custom Legend Component
interface LegendItem {
  name: string
  value: number
  color: string
  percent: number
  total?: number // Total for tooltip calculation
  valueType?: 'currency' | 'races' | 'expenses' // Type of value for tooltip formatting
}

type LegendDataInput = {
  name: string
  value: number
  color?: string
  valueType?: 'currency' | 'races' | 'expenses'
}

const prepareLegendData = (data: LegendDataInput[]): LegendItem[] => {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  return data.map((item, index) => ({
    name: item.name,
    value: item.value,
    color: item.color || COLORS[index % COLORS.length],
    percent: total > 0 ? (item.value / total) * 100 : 0,
    total: total, // Add total to each item for tooltip calculation
    valueType: item.valueType, // Preserve valueType for tooltip formatting
  }))
}

interface CustomLegendProps {
  data: LegendItem[]
  total: number
  valueIcon?: ReactNode
  valueFormatter?: (value: number) => string
  iconPosition?: 'before' | 'after'
}

const CustomLegend = ({
  data,
  total,
  valueIcon,
  valueFormatter,
  iconPosition = 'after',
}: CustomLegendProps) => {
  // Sort by value descending
  const sortedData = [...data].sort((a, b) => b.value - a.value)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isScrollable, setIsScrollable] = useState(false)
  const [showBottomFade, setShowBottomFade] = useState(false)
  const [showTopFade, setShowTopFade] = useState(false)
  
  useEffect(() => {
    const checkScrollability = () => {
      if (scrollRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = scrollRef.current
        const canScroll = scrollHeight > clientHeight
        setIsScrollable(canScroll)
        // Show bottom fade if not scrolled to bottom
        setShowBottomFade(canScroll && scrollTop + clientHeight < scrollHeight - 5)
        // Show top fade if scrolled down
        setShowTopFade(canScroll && scrollTop > 5)
      }
    }
    
    checkScrollability()
    
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = scrollRef.current
        setShowBottomFade(scrollTop + clientHeight < scrollHeight - 5)
        setShowTopFade(scrollTop > 5)
      }
    }
    
    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll)
      
      // Use ResizeObserver to handle dynamic content changes
      const resizeObserver = new ResizeObserver(() => {
        checkScrollability()
      })
      resizeObserver.observe(scrollElement)
      
      // Check again after a short delay to ensure content is rendered
      const timeout = setTimeout(checkScrollability, 100)
      
      return () => {
        scrollElement.removeEventListener('scroll', handleScroll)
        resizeObserver.disconnect()
        clearTimeout(timeout)
      }
    }
  }, [sortedData.length])
  
  const remainingCount = sortedData.length > 4 ? sortedData.length - 4 : 0
  
  return (
    <div className="relative mt-4">
      {/* Top fade when scrolled down */}
      {showTopFade && (
        <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/60 to-transparent" />
        </div>
      )}
      
      <div 
        ref={scrollRef}
        className="max-h-[7rem] overflow-y-auto space-y-2 pr-1 chart-legend-scroll"
      >
        {sortedData.map((item, index) => {
          const formattedValue = valueFormatter ? valueFormatter(item.value) : item.value.toLocaleString('tr-TR')
          return (
        <div
          key={index}
          className="grid grid-cols-[auto,minmax(0,1fr),auto,auto] items-center gap-3 text-sm"
        >
          <div
            className="w-4 h-4 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-700 truncate">{item.name}</span>
          <div className="flex items-center gap-1 font-semibold text-gray-900 justify-self-end tabular-nums">
            {valueIcon && iconPosition === 'before' ? (
              <span className="inline-flex items-center text-gray-400">{valueIcon}</span>
            ) : null}
            <span>{formattedValue}</span>
            {valueIcon && iconPosition === 'after' ? (
              <span className="inline-flex items-center text-gray-400">{valueIcon}</span>
            ) : null}
          </div>
          <span className="text-gray-500 text-right w-[3.5rem] tabular-nums">
            {item.percent.toFixed(0)}%
          </span>
        </div>
          )
        })}
      </div>
      
      {/* Bottom fade gradient and scroll indicator */}
      {showBottomFade && (
        <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-10">
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/70 to-transparent" />
          <div className="relative flex items-center justify-center gap-1.5 pt-2">
            <ChevronDown className="h-3.5 w-3.5 text-gray-400 animate-bounce" />
            {remainingCount > 0 && (
              <span className="text-[10px] font-medium text-gray-500">
                {remainingCount} daha
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const slice = payload[0]
    const data = slice.payload || {}
    const value = data.value || 0
    // Use total from data if available, otherwise calculate from all payload entries
    const totalValue = data.total || payload.reduce((sum: number, entry: any) => {
      return sum + (entry?.payload?.value || 0)
    }, 0)
    const percentValue =
      totalValue > 0 ? ((value / totalValue) * 100).toFixed(0) : '0'
    
    // Format value based on valueType - match the table format exactly
    let valueLabel: React.ReactNode
    
    if (data.valueType === 'currency' || data.valueType === 'expenses') {
      const formattedValue = formatCurrencyNumber(value)
      valueLabel = (
        <span className="flex items-center gap-1">
          <TurkishLira className="h-3 w-3 text-gray-400" />
          {formattedValue}
        </span>
      )
    } else {
      // Default to races
      valueLabel = `${value} koşu`
    }
    
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600 flex items-center gap-1">
          {valueLabel} ({percentValue}%)
        </p>
      </div>
    )
  }
  return null
}

export function StatisticsCharts({
  races,
  expenses,
  notes = [],
  hideButtons = false,
  onFilterTriggerReady,
  showFilterDropdown: externalShowFilterDropdown,
  onFilterDropdownChange,
  filterDropdownContainerRef,
  isGlobalStats = false,
  onActiveFiltersChange,
  showExpenseCategoryDistribution = false,
}: Props) {
  const { user } = useAuth()
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [stablemateFilters, setStablemateFilters] = useState<string[]>([])
  const [internalShowFilterDropdown, setInternalShowFilterDropdown] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)
  const enableExpenseCategoryDistribution = isGlobalStats || showExpenseCategoryDistribution
  
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

  // Filter races and expenses based on selected date range and stablemate
  const filteredRaces = useMemo(() => {
    let filtered = races
    
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
        case 'last6Months':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 6)
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

    // Apply stablemate filter (for trainers)
    if (stablemateFilters.length > 0 && user?.role === 'TRAINER') {
      filtered = filtered.filter((race) => {
        const stablemateName = race.horse?.stablemate?.name
        return stablemateName && stablemateFilters.includes(stablemateName)
      })
    }
    
    return filtered
  }, [races, selectedRange, stablemateFilters, user?.role])

  const filteredExpenses = useMemo(() => {
    let filtered = expenses
    
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
        case 'last6Months':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 6)
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

    // Apply stablemate filter (for trainers)
    if (stablemateFilters.length > 0 && user?.role === 'TRAINER') {
      filtered = filtered.filter((expense) => {
        const stablemateName = expense.horse?.stablemate?.name
        return stablemateName && stablemateFilters.includes(stablemateName)
      })
    }
    
    return filtered
  }, [expenses, selectedRange, stablemateFilters, user?.role])

  const cityData = getCityDistribution(filteredRaces)
  const distanceGroupData = useMemo(() => {
    const totals = DISTANCE_GROUP_DEFS.map((group, index) => ({
      id: group.id,
      name: group.label,
      value: 0,
      color: COLORS[index % COLORS.length],
    }))
    const totalsMap = new Map(totals.map((entry) => [entry.id, entry]))

    filteredRaces.forEach((race) => {
      const groupId = getDistanceGroupId(race.distance)
      if (!groupId) return
      const entry = totalsMap.get(groupId)
      if (!entry) return
      entry.value += 1
    })

    return totals.filter((entry) => entry.value > 0)
  }, [filteredRaces])
  const surfaceData = getSurfaceDistribution(filteredRaces)
  const raceTypeData = getRaceTypeDistribution(filteredRaces, filteredRaces.length || 1)
  const getRaceTypeDisplayName = useCallback((raceType?: string) => {
    const normalized = getNormalizedString(raceType)
    if (normalized.startsWith('KISA VADE HANDIKAP')) return 'KV Handikap Koşu'
    if (normalized.startsWith('KV-')) return 'Kısa Vade Koşu'
    if (normalized.startsWith('ŞARTLI')) return 'Şartlı Koşu'
    if (normalized.startsWith('HANDIKAP')) return 'Handikap Koşu'
    if (normalized.startsWith('KISA VADE')) return 'Kısa Vade Koşu'
    if (normalized.startsWith('MAIDEN')) return 'Maiden Koşu'
    if (/^G\d*/.test(normalized) || normalized.startsWith('G ')) return 'Grup Koşu'
    return raceType || 'Diğer'
  }, [])
  const raceTypeChartData = useMemo(() => {
    const grouped = new Map<
      string,
      {
        name: string
        value: number
        color: string
      }
    >()

    raceTypeData.forEach((item, index) => {
      const displayName = getRaceTypeDisplayName(item.name)
      const existing = grouped.get(displayName) || {
        name: displayName,
        value: 0,
        color: COLORS[index % COLORS.length],
      }
      existing.value += item.value
      grouped.set(displayName, existing)
    })

    return Array.from(grouped.values())
  }, [raceTypeData, getRaceTypeDisplayName])
  const jockeyData = getJockeyDistribution(filteredRaces)
  const raceTypePerformanceData = useMemo(() => {
    const colorMap = new Map(raceTypeChartData.map((item) => [item.name, item.color]))
    const performance = new Map<
      string,
      {
        name: string
        'İlk 3 sıra': number
        'Tabela sonu': number
        'Tabela dışı': number
        color: string
      }
    >()

    filteredRaces.forEach((race, index) => {
      if (!race.raceType || !race.position) return
      const label = getRaceTypeDisplayName(race.raceType)
      const entry =
        performance.get(label) ||
        {
          name: label,
          'İlk 3 sıra': 0,
          'Tabela sonu': 0,
          'Tabela dışı': 0,
          color: colorMap.get(label) || COLORS[index % COLORS.length],
        }

      if (race.position >= 1 && race.position <= 3) {
        entry['İlk 3 sıra'] += 1
      } else if (race.position >= 4 && race.position <= 5) {
        entry['Tabela sonu'] += 1
      } else if (race.position > 5) {
        entry['Tabela dışı'] += 1
      }

      performance.set(label, entry)
    })

    return Array.from(performance.values()).sort((a, b) => {
      const totalA = a['İlk 3 sıra'] + a['Tabela sonu'] + a['Tabela dışı']
      const totalB = b['İlk 3 sıra'] + b['Tabela sonu'] + b['Tabela dışı']
      return totalB - totalA
    })
  }, [filteredRaces, getRaceTypeDisplayName, raceTypeChartData])
  const surfacePerformanceData = getSurfacePerformanceData(filteredRaces)
  const distancePerformanceData = getDistancePerformanceData(filteredRaces)
  
  // Statistics category navigation state
  const [selectedCategory, setSelectedCategory] = useState<'genel' | 'pist' | 'mesafe' | 'sehir' | 'jokey' | 'kosu-turu' | 'gelir-gider' | 'yem-kilo'>('genel')
  
  // City performance data - show all cities
  const cityPerformanceData = useMemo(() => {
    return getCityPerformanceData(filteredRaces)
  }, [filteredRaces])
  
  // Get all jockey performance data
  const jockeyPerformanceData = useMemo(() => {
    return getJockeyPerformanceData(filteredRaces)
  }, [filteredRaces])
  
  // Click outside handler
  useEffect(() => {
    if (!showFilterDropdown) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const isInsideTrigger = filterDropdownRef.current?.contains(target)
      const isInsideDropdown = dropdownContentRef.current?.contains(target)
      const isInsidePortal = filterDropdownContainerRef?.current?.contains(target)

      if (!isInsideTrigger && !isInsideDropdown && !isInsidePortal) {
        setShowFilterDropdown(false)
      }
    }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilterDropdown, filterDropdownContainerRef, setShowFilterDropdown])

  // Get unique stablemates (for trainers)
  const getUniqueStablemates = useMemo(() => {
    if (user?.role !== 'TRAINER') return []
    const stablemateSet = new Set<string>()
    races.forEach((race) => {
      if (race.horse?.stablemate?.name) {
        stablemateSet.add(race.horse.stablemate.name)
      }
    })
    expenses.forEach((expense) => {
      if (expense.horse?.stablemate?.name) {
        stablemateSet.add(expense.horse.stablemate.name)
      }
    })
    return Array.from(stablemateSet).sort()
  }, [races, expenses, user?.role])

  const toggleStablemateFilter = useCallback((stablemate: string) => {
    setStablemateFilters((prev) =>
      prev.includes(stablemate)
        ? prev.filter((s) => s !== stablemate)
        : [...prev, stablemate]
    )
  }, [])

  const clearFilters = useCallback(() => {
    setSelectedRange(null)
    setStablemateFilters([])
  }, [])

  const activeFilterCount = (selectedRange ? 1 : 0) + stablemateFilters.length
  const hasActiveFilters = activeFilterCount > 0

  useEffect(() => {
    onActiveFiltersChange?.(activeFilterCount)
  }, [activeFilterCount, onActiveFiltersChange])

  // Dynamic earnings chart data based on selected range
  const getEarningsChartData = useMemo(() => {
    const now = new Date()
    let startDate: Date
    let grouping: 'daily' | 'weekly' | 'monthly'
    let title: string
    
    if (!selectedRange) {
      // Default: last 12 months
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      grouping = 'monthly'
      title = 'Toplam Kazanç'
    } else {
      switch (selectedRange) {
        case 'lastWeek':
          startDate = new Date(now)
          startDate.setDate(startDate.getDate() - 7)
          grouping = 'daily'
          title = 'Toplam Kazanç'
          break
        case 'lastMonth':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 1)
          grouping = 'weekly'
          title = 'Toplam Kazanç'
          break
        case 'last3Months':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 3)
          grouping = 'weekly'
          title = 'Toplam Kazanç'
          break
        case 'last6Months':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 6)
          grouping = 'monthly'
          title = 'Toplam Kazanç'
          break
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1)
          grouping = 'monthly'
          title = 'Toplam Kazanç'
          break
        default:
          startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
          grouping = 'monthly'
          title = 'Kazanç'
      }
    }
    
    const chartData: { [key: string]: number } = {}
    
    // Initialize time buckets
    const current = new Date(startDate)
    while (current <= now) {
      let key: string
      let label: string
      
      if (grouping === 'daily') {
        key = current.toISOString().split('T')[0]
        const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
        label = `${dayNames[current.getDay()]} ${current.getDate()}`
      } else if (grouping === 'weekly') {
        // Get week start (Monday)
        const weekStart = new Date(current)
        const day = weekStart.getDay()
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
        weekStart.setDate(diff)
        weekStart.setHours(0, 0, 0, 0)
        key = `week-${weekStart.toISOString().split('T')[0]}`
        label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`
      } else {
        // monthly
        key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
        const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
        label = `${monthNames[current.getMonth()]} ${current.getFullYear().toString().slice(2)}`
      }
      
      if (!chartData[key]) {
        chartData[key] = 0
      }
      
      if (grouping === 'daily') {
        current.setDate(current.getDate() + 1)
      } else if (grouping === 'weekly') {
        current.setDate(current.getDate() + 7)
      } else {
        current.setMonth(current.getMonth() + 1)
      }
    }
    
    // Aggregate earnings
    filteredRaces.forEach(race => {
      if (race.prizeMoney && parseFloat(race.prizeMoney) > 0) {
        const raceDate = new Date(race.raceDate)
        if (raceDate >= startDate && raceDate <= now) {
          let key: string
          
          if (grouping === 'daily') {
            key = raceDate.toISOString().split('T')[0]
          } else if (grouping === 'weekly') {
            const weekStart = new Date(raceDate)
            const day = weekStart.getDay()
            const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
            weekStart.setDate(diff)
            weekStart.setHours(0, 0, 0, 0)
            key = `week-${weekStart.toISOString().split('T')[0]}`
          } else {
            key = `${raceDate.getFullYear()}-${String(raceDate.getMonth() + 1).padStart(2, '0')}`
          }
          
          if (chartData.hasOwnProperty(key)) {
            chartData[key] += parseFloat(race.prizeMoney)
          }
        }
      }
    })
    
    // Convert to array and format labels - maintain order by iterating keys in order
    const sortedKeys = Object.keys(chartData).sort()
    return {
      data: sortedKeys.map((key) => {
        let label: string
        if (grouping === 'daily') {
          const date = new Date(key)
          const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
          label = `${dayNames[date.getDay()]} ${date.getDate()}`
        } else if (grouping === 'weekly') {
          const weekStart = new Date(key.replace('week-', ''))
          label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`
        } else {
          const [year, monthNum] = key.split('-')
      const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
          label = `${monthNames[parseInt(monthNum) - 1]} ${year.slice(2)}`
        }
      return {
          period: label,
          earnings: Math.round(chartData[key])
        }
      }),
      title
    }
  }, [filteredRaces, selectedRange])
  
  // Dynamic expenses chart data based on selected range
  const getExpensesChartData = useMemo(() => {
    const now = new Date()
    let startDate: Date
    let grouping: 'daily' | 'weekly' | 'monthly'
    let title: string
    
    if (!selectedRange) {
      // Default: last 12 months
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      grouping = 'monthly'
      title = 'Toplam Gider'
    } else {
      switch (selectedRange) {
        case 'lastWeek':
          startDate = new Date(now)
          startDate.setDate(startDate.getDate() - 7)
          grouping = 'daily'
          title = 'Toplam Gider'
          break
        case 'lastMonth':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 1)
          grouping = 'weekly'
          title = 'Toplam Gider'
          break
        case 'last3Months':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 3)
          grouping = 'weekly'
          title = 'Toplam Gider'
          break
        case 'last6Months':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 6)
          grouping = 'monthly'
          title = 'Toplam Gider'
          break
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1)
          grouping = 'monthly'
          title = 'Toplam Gider'
          break
        default:
          startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
          grouping = 'monthly'
          title = 'Gider'
      }
    }
    
    const chartData: { [key: string]: number } = {}
    
    // Initialize time buckets
    const current = new Date(startDate)
    while (current <= now) {
      let key: string
      
      if (grouping === 'daily') {
        key = current.toISOString().split('T')[0]
        current.setDate(current.getDate() + 1)
      } else if (grouping === 'weekly') {
        const weekStart = new Date(current)
        const day = weekStart.getDay()
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
        weekStart.setDate(diff)
        weekStart.setHours(0, 0, 0, 0)
        key = `week-${weekStart.toISOString().split('T')[0]}`
        current.setDate(current.getDate() + 7)
      } else {
        key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
        current.setMonth(current.getMonth() + 1)
      }
      
      chartData[key] = 0
    }
    
    // Aggregate expenses
    filteredExpenses.forEach(expense => {
      if (expense.amount && parseFloat(expense.amount) > 0) {
        const expenseDate = new Date(expense.date)
        if (expenseDate >= startDate && expenseDate <= now) {
          let key: string
          
          if (grouping === 'daily') {
            key = expenseDate.toISOString().split('T')[0]
          } else if (grouping === 'weekly') {
            const weekStart = new Date(expenseDate)
            const day = weekStart.getDay()
            const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
            weekStart.setDate(diff)
            weekStart.setHours(0, 0, 0, 0)
            key = `week-${weekStart.toISOString().split('T')[0]}`
          } else {
            key = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`
          }
          
          if (chartData.hasOwnProperty(key)) {
            chartData[key] += parseFloat(expense.amount)
          }
        }
      }
    })
    
    // Convert to array and format labels - maintain order by iterating keys in order
    const sortedKeys = Object.keys(chartData).sort()
    return {
      data: sortedKeys.map((key) => {
        let label: string
        if (grouping === 'daily') {
          const date = new Date(key)
          const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
          label = `${dayNames[date.getDay()]} ${date.getDate()}`
        } else if (grouping === 'weekly') {
          const weekStart = new Date(key.replace('week-', ''))
          label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`
        } else {
          const [year, monthNum] = key.split('-')
      const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
          label = `${monthNames[parseInt(monthNum) - 1]} ${year.slice(2)}`
        }
      return {
          period: label,
          expenses: Math.round(chartData[key])
      }
      }),
      title
  }
  }, [filteredExpenses, selectedRange])
  
  // Check if we have data
  const hasRaceData = filteredRaces.length > 0
  const hasExpenseData = filteredExpenses.length > 0

  const topEarningHorses = useMemo(() => {
    if (!isGlobalStats) return []
    const totals = new Map<string, { horseName: string; total: number; raceCount: number }>()
    filteredRaces.forEach((race) => {
      if (!race.prizeMoney) return
      const amount = Number(race.prizeMoney)
      if (!amount || Number.isNaN(amount)) return
      const key = race.horseId || race.horseName
      if (!key) return
      const entry = totals.get(key) || { horseName: race.horseName || 'Belirsiz', total: 0, raceCount: 0 }
      entry.total += amount
      entry.raceCount += 1
      totals.set(key, entry)
    })
    return Array.from(totals.values()).sort((a, b) => b.total - a.total)
  }, [isGlobalStats, filteredRaces])

  const topSpendingHorses = useMemo(() => {
    if (!isGlobalStats) return []
    const totals = new Map<string, { horseName: string; total: number; expenseCount: number }>()
    filteredExpenses.forEach((expense) => {
      if (!expense.amount) return
      const amount = Number(expense.amount)
      if (!amount || Number.isNaN(amount)) return
      const key = expense.horseId || expense.horseName
      if (!key) return
      const entry = totals.get(key) || { horseName: expense.horseName || 'Belirsiz', total: 0, expenseCount: 0 }
      entry.total += amount
      entry.expenseCount += 1
      totals.set(key, entry)
    })
    return Array.from(totals.values()).sort((a, b) => b.total - a.total)
  }, [isGlobalStats, filteredExpenses])

  const topEarningPieData = useMemo<LegendItem[]>(() => {
    const baseData = topEarningHorses.slice(0, 5).map((horse, index) => ({
      name: horse.horseName,
      value: horse.total,
      color: COLORS[index % COLORS.length],
      valueType: 'currency' as const,
    }))
    return prepareLegendData(baseData)
  }, [topEarningHorses])

  const topSpendingPieData = useMemo<LegendItem[]>(() => {
    const baseData = topSpendingHorses.slice(0, 5).map((horse, index) => ({
      name: horse.horseName,
      value: horse.total,
      color: COLORS[index % COLORS.length],
      valueType: 'expenses' as const,
    }))
    return prepareLegendData(baseData)
  }, [topSpendingHorses])

  const topEarningTotal = useMemo(
    () => topEarningPieData.reduce((sum, entry) => sum + entry.value, 0),
    [topEarningPieData],
  )
  const topSpendingTotal = useMemo(
    () => topSpendingPieData.reduce((sum, entry) => sum + entry.value, 0),
    [topSpendingPieData],
  )

  const expenseCategoryDistribution = useMemo(() => {
    if (!enableExpenseCategoryDistribution) return []
    const totals = new Map<string, number>()
    filteredExpenses.forEach((expense) => {
      if (!expense.amount) return
      const amount = Number(expense.amount)
      if (!amount || Number.isNaN(amount)) return
      const category = expense.category || 'Diğer'
      totals.set(category, (totals.get(category) || 0) + amount)
    })
    return Array.from(totals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [enableExpenseCategoryDistribution, filteredExpenses])

  const getCategoryDisplayName = useCallback((category?: string) => {
    if (!category) return 'Diğer'
    const translation = (TR.expenseCategories as Record<string, string> | undefined)?.[category]
    if (translation) return translation
    return category.replace(/_/g, ' ')
  }, [])

  const categoryHorseDistributions = useMemo(() => {
    if (!isGlobalStats) return []
    const categoryMap: Record<string, { total: number; horses: Record<string, number> }> = {}

    filteredExpenses.forEach((expense) => {
      if (!expense.amount) return
      const amount = Number(expense.amount)
      if (!amount || Number.isNaN(amount)) return
      const category = expense.category || 'Diğer'
      const horseName = expense.horseName || 'Belirsiz At'

      if (!categoryMap[category]) {
        categoryMap[category] = { total: 0, horses: {} }
      }

      categoryMap[category].total += amount
      categoryMap[category].horses[horseName] =
        (categoryMap[category].horses[horseName] || 0) + amount
    })

    return Object.entries(categoryMap)
      .map(([category, data]) => ({
        category: getCategoryDisplayName(category),
        total: data.total,
        horses: Object.entries(data.horses)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
      }))
      .sort((a, b) => b.total - a.total)
  }, [getCategoryDisplayName, isGlobalStats, filteredExpenses]);
  
  const shouldShowCategoryGrid =
    (enableExpenseCategoryDistribution && expenseCategoryDistribution.length > 0) ||
    (isGlobalStats && categoryHorseDistributions.length > 0)
  
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

              {/* Stablemate Filter (for trainers) */}
              {user?.role === 'TRAINER' && getUniqueStablemates.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Eküri</label>
                  <div className="flex flex-wrap gap-2">
                    {getUniqueStablemates.map((stablemate) => (
                      <button
                        type="button"
                        key={stablemate}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleStablemateFilter(stablemate)
                        }}
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

      {/* Statistics Navigation Sidebar and Content */}
      <div className="flex flex-col md:flex-row gap-6 mt-6">
        {/* Mobile Navigation - Horizontal Scrollable */}
        <div className="md:hidden w-full overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-2 min-w-max">
            {[
              { id: 'genel' as const, label: 'Genel', icon: BarChart3 },
              { id: 'pist' as const, label: 'Pist', icon: Layers },
              { id: 'mesafe' as const, label: 'Mesafe', icon: Ruler },
              { id: 'sehir' as const, label: 'Şehir', icon: MapPin },
              { id: 'jokey' as const, label: 'Jokey', icon: Users },
              { id: 'kosu-turu' as const, label: 'Koşu Türü', icon: Flag },
              { id: 'gelir-gider' as const, label: 'Gelir-Gider', icon: TurkishLira },
            ].map(({ id, label, icon: Icon }) => {
              const isActive = selectedCategory === id
              return (
                <button
                  key={id}
                  onClick={() => setSelectedCategory(id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Left Sidebar Navigation - Desktop Only */}
        <div className="hidden md:block flex-shrink-0">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg shadow-lg p-4 sticky top-4 min-w-fit">
            <nav className="space-y-1">
              {[
                { id: 'genel' as const, label: 'Genel', icon: BarChart3 },
                { id: 'pist' as const, label: 'Pist', icon: Layers },
                { id: 'mesafe' as const, label: 'Mesafe', icon: Ruler },
                { id: 'sehir' as const, label: 'Şehir', icon: MapPin },
                { id: 'jokey' as const, label: 'Jokey', icon: Users },
                { id: 'kosu-turu' as const, label: 'Koşu Türü', icon: Flag },
                { id: 'gelir-gider' as const, label: 'Gelir-Gider', icon: TurkishLira },
                { id: 'yem-kilo' as const, label: 'Yem - Kilo', icon: BarChart3 },
              ].map(({ id, label, icon: Icon }) => {
                const isActive = selectedCategory === id
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedCategory(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span>{label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 w-full">
    <div className="space-y-6">
            {/* Genel Category: First Row Charts */}
            {selectedCategory === 'genel' && (
              <>
      {/* First Row: 4 Pie Charts */}
      {hasRaceData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* City Distribution */}
          {cityData.length > 0 && (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-indigo-600" />
                  Şehir Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={prepareLegendData(cityData)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {cityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <CustomLegend
                  data={prepareLegendData(cityData)}
                  total={cityData.reduce((sum, item) => sum + item.value, 0)}
                />
              </CardContent>
            </Card>
          )}
          
          {/* Distance Distribution */}
          {distanceGroupData.length > 0 && (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                  <Ruler className="h-4 w-4 mr-2 text-indigo-600" />
                  Mesafe Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={prepareLegendData(distanceGroupData)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {distanceGroupData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <CustomLegend
                  data={prepareLegendData(distanceGroupData)}
                  total={distanceGroupData.reduce((sum, item) => sum + item.value, 0)}
                />
              </CardContent>
            </Card>
          )}
          
          {/* Surface Distribution */}
          {surfaceData.length > 0 && (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                  <Layers className="h-4 w-4 mr-2 text-indigo-600" />
                  Pist Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={prepareLegendData(surfaceData)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {surfaceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <CustomLegend
                  data={prepareLegendData(surfaceData)}
                  total={surfaceData.reduce((sum, item) => sum + item.value, 0)}
                />
              </CardContent>
            </Card>
          )}
          
          {/* Race Type Distribution */}
          {raceTypeChartData.length > 0 && (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                  <Flag className="h-4 w-4 mr-2 text-indigo-600" />
                  Koşu Türü
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={prepareLegendData(raceTypeChartData)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {raceTypeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <CustomLegend
                  data={prepareLegendData(raceTypeChartData)}
                  total={raceTypeChartData.reduce((sum, item) => sum + item.value, 0)}
                />
              </CardContent>
            </Card>
          )}
          
          {/* Jockey Distribution */}
          {jockeyData.length > 0 && (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-indigo-600" />
                  Jokey Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={prepareLegendData(jockeyData)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {jockeyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <CustomLegend
                  data={prepareLegendData(jockeyData)}
                  total={jockeyData.reduce((sum, item) => sum + item.value, 0)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
              </>
            )}

            {/* Pist Category: Surface Performance Charts */}
            {selectedCategory === 'pist' && (
              <>
                {hasRaceData && surfacePerformanceData.length > 0 && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {surfacePerformanceData.map((surfaceData) => {
            const total = surfaceData['İlk 3 sıra'] + surfaceData['Tabela sonu'] + surfaceData['Tabela dışı']
            const pieData = [
              { name: 'İlk 3 sıra', value: surfaceData['İlk 3 sıra'], color: '#10b981', total },
              { name: 'Tabela sonu', value: surfaceData['Tabela sonu'], color: '#f59e0b', total },
              { name: 'Tabela dışı', value: surfaceData['Tabela dışı'], color: '#6b7280', total },
            ].filter(item => item.value > 0)
            
            const surfaceColors: Record<string, string> = {
              'Çim': '#009900',
              'Kum': '#996633',
              'Sentetik': '#d39b1e',
            }
            const surfaceColor = surfaceColors[surfaceData.surface] || '#6366f1'
            
            return (
              <Card key={surfaceData.surface} className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                    <Trophy className="h-4 w-4 mr-2" style={{ color: surfaceColor }} />
                    {surfaceData.surface}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <CustomLegend
                    data={pieData.map(item => ({
                      name: item.name,
                      value: item.value,
                      color: item.color,
                      percent: (item.value / total) * 100,
                    }))}
                    total={total}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
        </div>
      )}
              </>
            )}

            {/* Mesafe Category: Distance Performance Charts */}
            {selectedCategory === 'mesafe' && (
              <>
                {hasRaceData && distancePerformanceData.length > 0 && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {distancePerformanceData.map((distanceData) => {
              const total = distanceData['İlk 3 sıra'] + distanceData['Tabela sonu'] + distanceData['Tabela dışı']
              const pieData = [
                { name: 'İlk 3 sıra', value: distanceData['İlk 3 sıra'], color: '#10b981', total },
                { name: 'Tabela sonu', value: distanceData['Tabela sonu'], color: '#f59e0b', total },
                { name: 'Tabela dışı', value: distanceData['Tabela dışı'], color: '#6b7280', total },
              ].filter(item => item.value > 0)
              
              const distanceColors: Record<string, string> = {
                'Kısa Mesafe': '#3b82f6',
                'Orta Mesafe': '#8b5cf6',
                'Uzun Mesafe': '#ec4899',
              }
              const distanceColor = distanceColors[distanceData.distance] || '#6366f1'
              
              return (
                <Card key={distanceData.distance} className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                      <Ruler className="h-4 w-4 mr-2" style={{ color: distanceColor }} />
                      {distanceData.distance}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <CustomLegend
                      data={pieData.map(item => ({
                        name: item.name,
                        value: item.value,
                        color: item.color,
                        percent: (item.value / total) * 100,
                      }))}
                      total={total}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
              </>
            )}

            {/* Şehir Category: City Performance Charts */}
            {selectedCategory === 'sehir' && (
              <>
                {hasRaceData && cityPerformanceData.length > 0 && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cityPerformanceData.map((cityData) => {
                const total = cityData['İlk 3 sıra'] + cityData['Tabela sonu'] + cityData['Tabela dışı']
                const pieData = [
                  { name: 'İlk 3 sıra', value: cityData['İlk 3 sıra'], color: '#10b981', total },
                  { name: 'Tabela sonu', value: cityData['Tabela sonu'], color: '#f59e0b', total },
                  { name: 'Tabela dışı', value: cityData['Tabela dışı'], color: '#6b7280', total },
                ].filter(item => item.value > 0)
                
                return (
                  <Card key={cityData.city} className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-indigo-600" />
                        {cityData.city}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <CustomLegend
                        data={pieData.map(item => ({
                          name: item.name,
                          value: item.value,
                          color: item.color,
                          percent: (item.value / total) * 100,
                        }))}
                        total={total}
                      />
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </div>
      )}
              </>
            )}

            {/* Jokey Category: Jockey Performance Charts */}
            {selectedCategory === 'jokey' && (
              <>
                {hasRaceData && jockeyPerformanceData.length > 0 && (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {jockeyPerformanceData.map((jockeyData) => {
                        const total = jockeyData['İlk 3 sıra'] + jockeyData['Tabela sonu'] + jockeyData['Tabela dışı']
                        const pieData = [
                          { name: 'İlk 3 sıra', value: jockeyData['İlk 3 sıra'], color: '#10b981', total },
                          { name: 'Tabela sonu', value: jockeyData['Tabela sonu'], color: '#f59e0b', total },
                          { name: 'Tabela dışı', value: jockeyData['Tabela dışı'], color: '#6b7280', total },
                        ].filter(item => item.value > 0)
                        
                        return (
                          <Card key={jockeyData.jockey} className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                <Users className="h-4 w-4 mr-2 text-indigo-600" />
                                {jockeyData.jockey}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={70}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {pieData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                              </ResponsiveContainer>
                              <CustomLegend
                                data={pieData.map(item => ({
                                  name: item.name,
                                  value: item.value,
                                  color: item.color,
                                  percent: (item.value / total) * 100,
                                }))}
                                total={total}
                              />
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Koşu Türü Category: Race type performance pies */}
            {selectedCategory === 'kosu-turu' && (
              <>
                {raceTypePerformanceData.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {raceTypePerformanceData.map((typeData, index) => {
                      const total =
                        typeData['İlk 3 sıra'] + typeData['Tabela sonu'] + typeData['Tabela dışı']
                      const pieData = [
                        { name: 'İlk 3 sıra', value: typeData['İlk 3 sıra'], color: '#10b981', total },
                        { name: 'Tabela sonu', value: typeData['Tabela sonu'], color: '#f59e0b', total },
                        { name: 'Tabela dışı', value: typeData['Tabela dışı'], color: '#9ca3af', total },
                      ].filter((item) => item.value > 0)

                      return (
                        <Card key={typeData.name} className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                              <Flag className="h-4 w-4 mr-2 text-indigo-600" />
                              {typeData.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={220}>
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  outerRadius={80}
                                  dataKey="value"
                                >
                                  {pieData.map((entry, idx) => (
                                    <Cell key={`${typeData.name}-${idx}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                            <CustomLegend
                              data={pieData.map((item) => ({
                                name: item.name,
                                value: item.value,
                                color: item.color,
                                percent: total > 0 ? (item.value / total) * 100 : 0,
                              }))}
                              total={total}
                            />
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                    <CardContent className="py-16 text-center text-sm text-gray-500">
                      Koşu türü verisi bulunamadı
                    </CardContent>
                  </Card>
                )}
              </>
            )}


            {/* Gelir-Gider Category: Earnings and Expenses */}
            {selectedCategory === 'gelir-gider' && (
              <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                <TurkishLira className="h-4 w-4 mr-2 text-emerald-600" />
                        {getEarningsChartData.title}{!selectedRange && <span className="text-gray-500 font-normal ml-1">(Son 12 Ay)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
                      {getEarningsChartData.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={getEarningsChartData.data}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="period"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
                            <p className="font-semibold text-gray-900">{payload[0].payload.period}</p>
                              <p className="text-sm text-emerald-600 font-semibold">
                              ₺{payload[0].value?.toLocaleString('tr-TR')}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="earnings"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#colorEarnings)"
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-gray-500 text-sm">Veri bulunamadı</p>
              </div>
            )}
            </CardContent>
          </Card>
        
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                <TurkishLira className="h-4 w-4 mr-2 text-indigo-600" />
                        {getExpensesChartData.title}{!selectedRange && <span className="text-gray-500 font-normal ml-1">(Son 12 Ay)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
                      {getExpensesChartData.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={getExpensesChartData.data}>
                  <defs>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="period"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
                            <p className="font-semibold text-gray-900">{payload[0].payload.period}</p>
                            <p className="text-sm text-red-600 font-semibold">
                              ₺{payload[0].value?.toLocaleString('tr-TR')}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    strokeWidth={3}
                    fill="url(#colorExpenses)"
                    dot={{ fill: '#ef4444', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-gray-500 text-sm">Veri bulunamadı</p>
      </div>
            )}
            </CardContent>
          </Card>
      </div>
      
        {isGlobalStats && (topEarningPieData.length > 0 || topSpendingPieData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {topEarningPieData.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                            <TurkishLira className="h-4 w-4 mr-2 text-emerald-600" />
                            En Fazla Kazanan Atlar
              </CardTitle>
            </CardHeader>
            <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={topEarningPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={90}
                        fill="#10b981"
                        dataKey="value"
                      >
                        {topEarningPieData.map((entry, index) => (
                          <Cell key={`top-earning-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <CustomLegend
                    data={topEarningPieData}
                    total={topEarningTotal}
                    valueIcon={<TurkishLira className="h-3 w-3 text-gray-500" />}
                    iconPosition="before"
                    valueFormatter={formatCurrencyNumber}
                  />
                        </CardContent>
                      </Card>
                    )}

            {topSpendingPieData.length > 0 && (
                      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                            <TurkishLira className="h-4 w-4 mr-2 text-rose-600" />
                            En Fazla Gideri Olan Atlar
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                          data={topSpendingPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={90}
                          fill="#ef4444"
                          dataKey="value"
                        >
                          {topSpendingPieData.map((entry, index) => (
                            <Cell key={`top-spending-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload
                              return (
                                <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
                                  <p className="font-semibold text-gray-900">{data.name}</p>
                                  <p className="text-sm text-rose-600 font-semibold">
                                    {formatCurrencyNumber(data.value)}
                                  </p>
                          </div>
                              )
                            }
                            return null
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <CustomLegend
                      data={topSpendingPieData}
                      total={topSpendingTotal}
                      valueIcon={<TurkishLira className="h-3 w-3 text-gray-500" />}
                      iconPosition="before"
                      valueFormatter={formatCurrencyNumber}
                    />
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

        {shouldShowCategoryGrid && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {enableExpenseCategoryDistribution && expenseCategoryDistribution.length > 0 && (() => {
              const totalExpenses = expenseCategoryDistribution.reduce((sum, entry) => sum + entry.value, 0)
              const expenseCategoryPieData = addPercentages(
                expenseCategoryDistribution.map((item, idx) => ({
                  ...item,
                  name: getCategoryDisplayName(item.name),
                  color: COLORS[idx % COLORS.length],
                })),
              )

              return (
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                    <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4 text-indigo-600" />
                        Gider Kategorileri Dağılımı
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                          data={expenseCategoryPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                          outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                          {expenseCategoryPieData.map((entry, idx) => (
                            <Cell key={`expense-category-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <CustomLegend
                      data={expenseCategoryPieData}
                      total={totalExpenses}
                        valueIcon={<TurkishLira className="h-3 w-3 text-gray-500" />}
                        iconPosition="before"
                        valueFormatter={formatCurrencyNumber}
              />
            </CardContent>
          </Card>
              )
            })()}

            {isGlobalStats && categoryHorseDistributions.slice(0, MAX_CATEGORY_CHARTS).map((categoryData, categoryIndex) => {
              const total = categoryData.total
              const topEntries = categoryData.horses.slice(0, 5)
              const remainingEntries = categoryData.horses.slice(5)
              const otherTotal = remainingEntries.reduce((sum, entry) => sum + entry.value, 0)
              const pieData = [...topEntries]
              if (otherTotal > 0) {
                pieData.push({ name: 'Diğer', value: otherTotal })
              }
              const colorsForCategory = pieData.map(
                (_, idx) => COLORS[(categoryIndex + idx) % COLORS.length],
              )
              const pieDataWithPercent = addPercentages(
                pieData.map((entry, idx) => ({
                  ...entry,
                  color: colorsForCategory[idx],
                  total: total, // Add total for tooltip calculation
                })),
              )

              return (
                <Card
                  key={categoryData.category}
                  className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4 text-indigo-600" />
                      {categoryData.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {total > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={pieDataWithPercent}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              dataKey="value"
                            >
                              {pieDataWithPercent.map((entry, idx) => (
                                <Cell
                                  key={`${categoryData.category}-${idx}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-2 text-sm">
                          {pieDataWithPercent.map((entry, idx) => (
                            <div
                              key={`${categoryData.category}-${entry.name}-${idx}`}
                              className="flex items-center gap-3"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span
                                  className="w-3 h-3 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-gray-800 font-medium truncate">{entry.name}</span>
                              </div>
                              <div className="w-24 text-right font-semibold text-gray-900">
                                {formatCurrencyNumber(entry.value)}
                              </div>
                              <div className="w-12 text-right text-xs font-semibold text-gray-500">
                                {entry.percent >= 10 ? Math.round(entry.percent) : entry.percent.toFixed(1)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-[220px]">
                        <p className="text-sm text-gray-500">Veri bulunamadı</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
    </div>
        )}
              </>
      )}

            {/* Yem - Kilo Category: Weight and Feed Tracking */}
            {selectedCategory === 'yem-kilo' && (
              <>
                {(() => {
                  // Apply date range filter to notes
                  let filteredNotes = notes
                  
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
                      case 'last6Months':
                        startDate = new Date(now)
                        startDate.setMonth(startDate.getMonth() - 6)
                        break
                      case 'thisYear':
                        startDate = new Date(now.getFullYear(), 0, 1)
                        break
                    }

                    if (startDate) {
                      filteredNotes = filteredNotes.filter(note => {
                        const noteDate = new Date(note.date)
                        return noteDate >= startDate!
                      })
                    }
                  }
                  
                  // Filter notes for Kilo Takibi and Yem Takibi
                  const kiloNotes = filteredNotes.filter(n => n.category === 'Kilo Takibi' && n.kiloValue !== null && n.kiloValue !== undefined)
                  const yemNotes = filteredNotes.filter(n => n.category === 'Yem Takibi' && n.kiloValue !== null && n.kiloValue !== undefined)
                  
                  // Group by month for both categories
                  const groupByMonth = (notesList: NoteData[]) => {
                    const grouped: Record<string, { total: number; count: number }> = {}
                    notesList.forEach(note => {
                      const date = new Date(note.date)
                      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                      if (!grouped[monthKey]) {
                        grouped[monthKey] = { total: 0, count: 0 }
                      }
                      if (note.kiloValue) {
                        grouped[monthKey].total += note.kiloValue
                        grouped[monthKey].count += 1
                      }
                    })
                    const sorted = Object.entries(grouped)
                      .map(([month, data]) => ({
                        period: month,
                        average: data.count > 0 ? data.total / data.count : 0,
                        total: data.total,
                      }))
                      .sort((a, b) => a.period.localeCompare(b.period))
                    
                    // If no date range selected, show last 12 months, otherwise show all filtered months
                    return selectedRange ? sorted : sorted.slice(-12)
                  }
                  
                  const kiloData = groupByMonth(kiloNotes)
                  const yemData = groupByMonth(yemNotes)
                  
                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Kilo Takibi Chart */}
                      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                            <BarChart3 className="h-4 w-4 mr-2 text-indigo-600" />
                            Kilo Takibi {selectedRange ? (
                              <span className="text-gray-500 font-normal ml-1">
                                ({RANGE_OPTIONS.find(o => o.value === selectedRange)?.label})
                              </span>
                            ) : (
                              <span className="text-gray-500 font-normal ml-1">(Son 12 Ay)</span>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {kiloData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                              <LineChart data={kiloData}>
                                <defs>
                                  <linearGradient id="colorKilo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                  dataKey="period"
                                  stroke="#6b7280"
                                  style={{ fontSize: '11px' }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={60}
                                />
                                <YAxis
                                  stroke="#6b7280"
                                  style={{ fontSize: '12px' }}
                                  tickFormatter={(value) => `${value.toFixed(1)} kg`}
                                />
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
                                          <p className="font-semibold text-gray-900">{payload[0].payload.period}</p>
                                          <p className="text-sm text-indigo-600 font-semibold">
                                            {typeof payload[0].value === 'number' ? payload[0].value.toFixed(1) : '0.0'} kg
                                          </p>
                                        </div>
                                      )
                                    }
                                    return null
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="average"
                                  stroke="#6366f1"
                                  strokeWidth={3}
                                  fill="url(#colorKilo)"
                                  dot={{ fill: '#6366f1', r: 4 }}
                                  activeDot={{ r: 6 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-[250px]">
                              <p className="text-gray-500 text-sm">Kilo Takibi verisi bulunamadı</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      {/* Yem Takibi Chart */}
                      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                            <BarChart3 className="h-4 w-4 mr-2 text-emerald-600" />
                            Yem Takibi {selectedRange ? (
                              <span className="text-gray-500 font-normal ml-1">
                                ({RANGE_OPTIONS.find(o => o.value === selectedRange)?.label})
                              </span>
                            ) : (
                              <span className="text-gray-500 font-normal ml-1">(Son 12 Ay)</span>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {yemData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                              <LineChart data={yemData}>
                                <defs>
                                  <linearGradient id="colorYem" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                  dataKey="period"
                                  stroke="#6b7280"
                                  style={{ fontSize: '11px' }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={60}
                                />
                                <YAxis
                                  stroke="#6b7280"
                                  style={{ fontSize: '12px' }}
                                  tickFormatter={(value) => `${value.toFixed(1)} kg`}
                                />
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
                                          <p className="font-semibold text-gray-900">{payload[0].payload.period}</p>
                                          <p className="text-sm text-emerald-600 font-semibold">
                                            {typeof payload[0].value === 'number' ? payload[0].value.toFixed(1) : '0.0'} kg
                                          </p>
                                        </div>
                                      )
                                    }
                                    return null
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="average"
                                  stroke="#10b981"
                                  strokeWidth={3}
                                  fill="url(#colorYem)"
                                  dot={{ fill: '#10b981', r: 4 }}
                                  activeDot={{ r: 6 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-[250px]">
                              <p className="text-gray-500 text-sm">Yem Takibi verisi bulunamadı</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )
                })()}
              </>
            )}
    </div>
        </div>
      </div>
    </>
  )
}
