'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { MapPin, Ruler, Layers, Users, TurkishLira, Flag, Filter, X, Trophy, ChevronDown, BarChart3 } from 'lucide-react'
import {
  getCityDistribution,
  getDistanceDistribution,
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
}

interface ExpenseData {
  date: string
  amount: string
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
  hideButtons?: boolean
  onFilterTriggerReady?: (trigger: () => void) => void
  showFilterDropdown?: boolean
  onFilterDropdownChange?: (show: boolean) => void
  filterDropdownContainerRef?: React.RefObject<HTMLDivElement>
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

// Custom Legend Component
interface LegendItem {
  name: string
  value: number
  color: string
  percent: number
}

const CustomLegend = ({ data, total }: { data: LegendItem[]; total: number }) => {
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
      {sortedData.map((item, index) => (
        <div key={index} className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 flex-1">
            <div
              className="w-4 h-4 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-700 truncate">{item.name}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="font-semibold text-gray-900">{item.value}</span>
            <span className="text-gray-500 w-12 text-right">{item.percent.toFixed(0)}%</span>
          </div>
        </div>
      ))}
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
    // Calculate percent from the payload data
    const data = payload[0].payload
    const value = data.value || 0
    const percent = data.percent ? data.percent.toFixed(0) : '0'
    
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600">
          {value} koşu ({percent}%)
        </p>
      </div>
    )
  }
  return null
}

export function StatisticsCharts({ races, expenses, hideButtons = false, onFilterTriggerReady, showFilterDropdown: externalShowFilterDropdown, onFilterDropdownChange, filterDropdownContainerRef }: Props) {
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [internalShowFilterDropdown, setInternalShowFilterDropdown] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)
  
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

  // Filter races and expenses based on selected date range
  const filteredRaces = useMemo(() => {
    if (!selectedRange) return races
    
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
      return races.filter(race => {
        const raceDate = new Date(race.raceDate)
        return raceDate >= startDate!
      })
    }
    
    return races
  }, [races, selectedRange])

  const filteredExpenses = useMemo(() => {
    if (!selectedRange) return expenses
    
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
      return expenses.filter(expense => {
        const expenseDate = new Date(expense.date)
        return expenseDate >= startDate!
      })
    }
    
    return expenses
  }, [expenses, selectedRange])

  const cityData = getCityDistribution(filteredRaces)
  const distanceData = getDistanceDistribution(filteredRaces)
  const surfaceData = getSurfaceDistribution(filteredRaces)
  const raceTypeData = getRaceTypeDistribution(filteredRaces)
  const jockeyData = getJockeyDistribution(filteredRaces)
  const surfacePerformanceData = getSurfacePerformanceData(filteredRaces)
  const distancePerformanceData = getDistancePerformanceData(filteredRaces)
  
  // Statistics category navigation state
  const [selectedCategory, setSelectedCategory] = useState<'genel' | 'pist' | 'mesafe' | 'sehir' | 'jokey' | 'gelir-gider'>('genel')
  
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
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        showFilterDropdown &&
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(target) &&
        dropdownContentRef.current &&
        !dropdownContentRef.current.contains(target) &&
        filterDropdownContainerRef?.current &&
        !filterDropdownContainerRef.current.contains(target)
      ) {
        setShowFilterDropdown(false)
      }
    }

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterDropdown, filterDropdownContainerRef, setShowFilterDropdown])

  const clearFilters = useCallback(() => {
    setSelectedRange(null)
  }, [])

  const hasActiveFilters = !!selectedRange

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
      title = 'Kazanç'
    } else {
      switch (selectedRange) {
        case 'lastWeek':
          startDate = new Date(now)
          startDate.setDate(startDate.getDate() - 7)
          grouping = 'daily'
          title = 'Kazanç'
          break
        case 'lastMonth':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 1)
          grouping = 'weekly'
          title = 'Kazanç'
          break
        case 'last3Months':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 3)
          grouping = 'weekly'
          title = 'Kazanç'
          break
        case 'last6Months':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 6)
          grouping = 'monthly'
          title = 'Kazanç'
          break
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1)
          grouping = 'monthly'
          title = 'Kazanç'
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
      title = 'Gider'
    } else {
      switch (selectedRange) {
        case 'lastWeek':
          startDate = new Date(now)
          startDate.setDate(startDate.getDate() - 7)
          grouping = 'daily'
          title = 'Gider'
          break
        case 'lastMonth':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 1)
          grouping = 'weekly'
          title = 'Gider'
          break
        case 'last3Months':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 3)
          grouping = 'weekly'
          title = 'Gider'
          break
        case 'last6Months':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 6)
          grouping = 'monthly'
          title = 'Gider'
          break
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1)
          grouping = 'monthly'
          title = 'Gider'
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
  
  // Helper to prepare legend data
  const prepareLegendData = (data: any[]): LegendItem[] => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    return data.map((item, index) => ({
      name: item.name,
      value: item.value,
      color: item.color || COLORS[index % COLORS.length],
      percent: (item.value / total) * 100,
    }))
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

          // Render dropdown in portal if hideButtons is true, otherwise inline
          if (hideButtons && filterDropdownContainerRef?.current) {
            return createPortal(dropdownContent, filterDropdownContainerRef.current)
          }
          
          return dropdownContent
        })()}
      </div>

      {/* Statistics Navigation Sidebar and Content */}
      <div className="flex gap-6 mt-6">
        {/* Left Sidebar Navigation */}
        <div className="flex-shrink-0">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg shadow-lg p-4 sticky top-4 min-w-fit">
            <nav className="space-y-1">
              {[
                { id: 'genel' as const, label: 'Genel', icon: BarChart3 },
                { id: 'pist' as const, label: 'Pist', icon: Layers },
                { id: 'mesafe' as const, label: 'Mesafe', icon: Ruler },
                { id: 'sehir' as const, label: 'Şehir', icon: MapPin },
                { id: 'jokey' as const, label: 'Jokey', icon: Users },
                { id: 'gelir-gider' as const, label: 'Gelir-Gider', icon: TurkishLira },
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
        <div className="flex-1 min-w-0">
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
          {distanceData.length > 0 && (
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
                      data={prepareLegendData(distanceData)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {distanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <CustomLegend
                  data={prepareLegendData(distanceData)}
                  total={distanceData.reduce((sum, item) => sum + item.value, 0)}
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
          {raceTypeData.length > 0 && (
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
                      data={prepareLegendData(raceTypeData)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {raceTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <CustomLegend
                  data={prepareLegendData(raceTypeData)}
                  total={raceTypeData.reduce((sum, item) => sum + item.value, 0)}
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
              { name: 'İlk 3 sıra', value: surfaceData['İlk 3 sıra'], color: '#10b981' },
              { name: 'Tabela sonu', value: surfaceData['Tabela sonu'], color: '#f59e0b' },
              { name: 'Tabela dışı', value: surfaceData['Tabela dışı'], color: '#6b7280' },
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
                { name: 'İlk 3 sıra', value: distanceData['İlk 3 sıra'], color: '#10b981' },
                { name: 'Tabela sonu', value: distanceData['Tabela sonu'], color: '#f59e0b' },
                { name: 'Tabela dışı', value: distanceData['Tabela dışı'], color: '#6b7280' },
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
                  { name: 'İlk 3 sıra', value: cityData['İlk 3 sıra'], color: '#10b981' },
                  { name: 'Tabela sonu', value: cityData['Tabela sonu'], color: '#f59e0b' },
                  { name: 'Tabela dışı', value: cityData['Tabela dışı'], color: '#6b7280' },
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
                          { name: 'İlk 3 sıra', value: jockeyData['İlk 3 sıra'], color: '#10b981' },
                          { name: 'Tabela sonu', value: jockeyData['Tabela sonu'], color: '#f59e0b' },
                          { name: 'Tabela dışı', value: jockeyData['Tabela dışı'], color: '#6b7280' },
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

            {/* Gelir-Gider Category: Dynamic Time-based Charts (Earnings + Expenses) */}
            {selectedCategory === 'gelir-gider' && (
              <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Earnings Chart */}
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                <TurkishLira className="h-4 w-4 mr-2 text-indigo-600" />
              {getEarningsChartData.title}
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
                            <p className="text-sm text-green-600 font-semibold">
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
        
        {/* Expenses Chart */}
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                <TurkishLira className="h-4 w-4 mr-2 text-indigo-600" />
              {getExpensesChartData.title}
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
              </>
      )}
    </div>
        </div>
      </div>
    </>
  )
}
