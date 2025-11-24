'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { ArrowLeft, FileText, MapPin, Filter, Plus, NotebookPen } from 'lucide-react'
import { TR } from '@/lib/constants/tr'
import { toast } from 'sonner'
import { AddNoteModal } from '@/app/components/modals/add-note-modal'
import { AddExpenseModal } from '@/app/components/modals/add-expense-modal'
import { ChangeLocationModal } from '@/app/components/modals/change-location-modal'
import { AddBannedMedicineModal } from '@/app/components/modals/add-banned-medicine-modal'
import { ShowTrainingPlansModal } from '@/app/components/modals/show-training-plans-modal'
import { HorseMetadataCard } from '@/app/components/horse-detail/HorseMetadataCard'
import { StatisticsCharts } from '@/app/components/horse-detail/StatisticsCharts'
import { PedigreeTree } from '@/app/components/horse-detail/PedigreeTree'
import { RaceHistoryTable } from '@/app/components/horse-detail/RaceHistoryTable'
import { GallopsTable } from '@/app/components/horse-detail/GallopsTable'
import { HorseExpensesTable } from '@/app/components/horse-detail/HorseExpensesTable'
import { HorseNotesList } from '@/app/components/horse-detail/HorseNotesList'
import { BannedMedicinesTable } from '@/app/components/horse-detail/BannedMedicinesTable'
import { formatCurrency } from '@/lib/utils/format'

interface LocationHistory {
  id: string
  startDate: string
  endDate: string | null
  racecourse: { id: string; name: string } | null
  farm: { id: string; name: string } | null
}

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

const HORSE_TABS = ['info', 'pedigree', 'races', 'gallops', 'banned-medicines', 'statistics', 'expenses', 'notes'] as const
type HorseTab = (typeof HORSE_TABS)[number]

const isHorseTab = (value: string | null): value is HorseTab => {
  return !!value && HORSE_TABS.includes(value as HorseTab)
}

interface HorseDetail {
  id: string
  name: string
  yob?: number
  status: string
  gender?: string
  racecourse?: { id: string; name: string }
  farm?: { id: string; name: string }
  trainer?: { id: string; fullName: string }
  groomName?: string
  stableLabel?: string
  externalRef?: string
  // Detailed statistics
  handicapPoints?: number
  totalEarnings?: string
  prizeMoney?: string
  ownerPremium?: string
  breederPremium?: string
  totalRaces?: number
  firstPlaces?: number
  secondPlaces?: number
  thirdPlaces?: number
  fourthPlaces?: number
  fifthPlaces?: number
  turfRaces?: number
  turfFirsts?: number
  turfEarnings?: string
  dirtRaces?: number
  dirtFirsts?: number
  dirtEarnings?: string
  syntheticRaces?: number
  syntheticFirsts?: number
  syntheticEarnings?: string
  // Pedigree
  sireName?: string
  damName?: string
  sireSire?: string
  sireDam?: string
  damSire?: string
  damDam?: string
  // Extended Pedigree (4th generation)
  sireSireSire?: string
  sireSireDam?: string
  sireDamSire?: string
  sireDamDam?: string
  damSireSire?: string
  damSireDam?: string
  damDamSire?: string
  damDamDam?: string
  // Metadata
  dataFetchedAt?: string
  dataFetchError?: string
  expenses?: Array<{
    id: string
    date: string
    category: string
    customName?: string
    amount: number
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
  }>
  notes?: Array<{
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
  }>
  locationHistory?: LocationHistory[]
  raceHistory?: RaceHistory[]
  gallops?: Array<{
    id: string
    gallopDate: string
    status?: string
    racecourse?: string
    surface?: string
    jockeyName?: string
    distances: any
  }>
  bannedMedicines?: Array<{
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
  }>
}

export default function HorseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const horseId = params?.id as string

  const [horse, setHorse] = useState<HorseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isBannedMedicineModalOpen, setIsBannedMedicineModalOpen] = useState(false)
  const [isShowTrainingPlansModalOpen, setIsShowTrainingPlansModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<HorseTab>(() => {
    const tabParam = searchParams?.get('tab')
    return isHorseTab(tabParam) ? tabParam : 'info'
  })
  const [showExpensesFilter, setShowExpensesFilter] = useState(false)
  const [showNotesFilter, setShowNotesFilter] = useState(false)
  const [showStatisticsFilter, setShowStatisticsFilter] = useState(false)
  const [showRacesFilter, setShowRacesFilter] = useState(false)
  const [showGallopsFilter, setShowGallopsFilter] = useState(false)
  const [racesFilterCount, setRacesFilterCount] = useState(0)
  const [gallopsFilterCount, setGallopsFilterCount] = useState(0)
  const [statisticsFilterCount, setStatisticsFilterCount] = useState(0)
  const [expensesFilterCount, setExpensesFilterCount] = useState(0)
  const [notesFilterCount, setNotesFilterCount] = useState(0)
  const [bannedMedicinesFilterCount, setBannedMedicinesFilterCount] = useState(0)
  const [showBannedMedicinesFilter, setShowBannedMedicinesFilter] = useState(false)
  const [visibleExpenseTotal, setVisibleExpenseTotal] = useState(0)
  const [visibleExpenseCurrency, setVisibleExpenseCurrency] = useState('TRY')
  const filterTriggerRef = useRef<(() => void) | null>(null)
  const highlightGallopId = searchParams?.get('highlightGallop') || undefined
  const highlightRaceId = searchParams?.get('highlightRace') || undefined
  const highlightExpenseId = searchParams?.get('highlightExpense') || undefined
  const highlightBannedMedicineId = searchParams?.get('highlightBannedMedicine') || undefined

  useEffect(() => {
    const tabParam = searchParams?.get('tab')
    if (isHorseTab(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const handleTabChange = (value: string) => {
    if (isHorseTab(value)) {
      // Update URL to reflect tab change, but preserve highlight parameters
      const params = new URLSearchParams(searchParams?.toString() || '')
      params.set('tab', value)
      // Keep highlight parameters if they exist
      router.replace(`/app/horses/${horseId}?${params.toString()}`, { scroll: false })
      // The useEffect will update activeTab when the URL changes
    }
  }
  const notesFilterTriggerRef = useRef<(() => void) | null>(null)
  const statisticsFilterTriggerRef = useRef<(() => void) | null>(null)
  const racesFilterTriggerRef = useRef<(() => void) | null>(null)
  const gallopsFilterTriggerRef = useRef<(() => void) | null>(null)
  const bannedMedicinesFilterTriggerRef = useRef<(() => void) | null>(null)
  const expensesFilterButtonRef = useRef<HTMLDivElement>(null)
  const notesFilterButtonRef = useRef<HTMLDivElement>(null)
  const statisticsFilterButtonRef = useRef<HTMLDivElement>(null)
  const racesFilterButtonRef = useRef<HTMLDivElement>(null)
  const gallopsFilterButtonRef = useRef<HTMLDivElement>(null)
  const bannedMedicinesFilterButtonRef = useRef<HTMLDivElement>(null)
  const mobileTabsContainerRef = useRef<HTMLDivElement>(null)
  const activeTabButtonRef = useRef<HTMLButtonElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(true)

  const getFilterButtonClass = (hasActive: boolean) =>
    `border-2 font-medium px-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
      hasActive
        ? 'border-[#6366f1] bg-indigo-50 text-[#6366f1]'
        : 'border-gray-300 text-gray-700 hover:border-gray-400'
    }`

  const renderFilterBadge = (count: number) =>
    count > 0 ? (
      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#6366f1] text-white text-xs font-semibold">
        {count}
      </span>
    ) : null

  useEffect(() => {
    if (horseId) {
      fetchHorse()
    }
  }, [horseId])

  // Center the active tab in mobile view and update fade indicators
  useEffect(() => {
    const container = mobileTabsContainerRef.current
    if (!container) return

    const checkScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container
      const hasMoreContent = scrollWidth > clientWidth
      setShowLeftFade(hasMoreContent && scrollLeft > 10)
      setShowRightFade(hasMoreContent && scrollLeft < scrollWidth - clientWidth - 10)
    }

    // Center active tab
    if (activeTabButtonRef.current && container) {
      const button = activeTabButtonRef.current
      const buttonLeft = button.offsetLeft
      const buttonWidth = button.offsetWidth
      const containerWidth = container.offsetWidth
      const scrollLeft = buttonLeft - (containerWidth / 2) + (buttonWidth / 2)
      
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      })
      
      // Check scroll position after scrolling
      setTimeout(checkScroll, 300)
    } else {
      checkScroll()
    }

    // Listen to scroll events
    container.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)

    return () => {
      container.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [activeTab])


useEffect(() => {
  if (horse?.expenses && horse.expenses.length > 0) {
    const total = horse.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    const currency = horse.expenses[0]?.currency || 'TRY'
    setVisibleExpenseTotal(total)
    setVisibleExpenseCurrency(currency)
  } else {
    setVisibleExpenseTotal(0)
    setVisibleExpenseCurrency('TRY')
  }
}, [horse?.expenses])

  const fetchHorse = async () => {
    try {
      const response = await fetch(`/api/horses/${horseId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'At yüklenemedi')
      }

      const horseData = data.horse

      // Fetch notes separately
      try {
        const notesResponse = await fetch(`/api/horses/${horseId}/notes`)
        const notesData = await notesResponse.json()
        if (notesResponse.ok && notesData.notes) {
          horseData.notes = notesData.notes
        }
      } catch (notesError) {
        console.error('Fetch notes error:', notesError)
        // Don't fail the whole page if notes fail
      }

      // Fetch banned medicines separately
      try {
        const medicinesResponse = await fetch(`/api/horses/${horseId}/banned-medicines`)
        const medicinesData = await medicinesResponse.json()
        if (medicinesResponse.ok && medicinesData.medicines) {
          horseData.bannedMedicines = medicinesData.medicines
        }
      } catch (medicinesError) {
        console.error('Fetch banned medicines error:', medicinesError)
        // Don't fail the whole page if medicines fail
      }

      setHorse(horseData)
    } catch (error) {
      console.error('Fetch horse error:', error)
      toast.error('At yüklenirken bir hata oluştu')
      router.push('/app/horses')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
          </div>
          <p className="text-gray-900 font-semibold">{TR.common.loading}</p>
          <p className="text-sm text-gray-600 mt-2">At bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!horse) {
    return null
  }

  // Prepare data for components
  const currentLocation = horse.racecourse?.name || horse.farm?.name
  const locationType = horse.racecourse ? 'racecourse' : horse.farm ? 'farm' : undefined
  
  // Find last race date and last prize date
  const lastRaceDate = horse.raceHistory && horse.raceHistory.length > 0
    ? horse.raceHistory[0].raceDate
    : undefined
  
  const lastPrizeDate = horse.raceHistory && horse.raceHistory.length > 0
    ? horse.raceHistory.find(r => r.prizeMoney && parseFloat(r.prizeMoney) > 0)?.raceDate
    : undefined
    
  const lastExpenseDate = horse.expenses && horse.expenses.length > 0
    ? horse.expenses[0].date
    : undefined

  // Calculate remaining wait days for banned medicines
  const calculateRemainingDays = (givenDate: string, waitDays: number): number => {
    const given = new Date(givenDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    given.setHours(0, 0, 0, 0)
    
    const daysSinceGiven = Math.floor((today.getTime() - given.getTime()) / (1000 * 60 * 60 * 24))
    const remaining = waitDays - daysSinceGiven
    
    return Math.max(0, remaining)
  }

  // Find the medicine with the most remaining days (the one that needs the longest wait)
  let remainingWaitDays: number | null = null
  let activeBannedMedicine: { id: string; name: string } | null = null
  if (horse.bannedMedicines && horse.bannedMedicines.length > 0) {
    const medicinesWithRemaining = horse.bannedMedicines
      .map(med => ({
        ...med,
        remainingDays: calculateRemainingDays(med.givenDate, med.waitDays)
      }))
      .filter(med => med.remainingDays > 0)
    
    if (medicinesWithRemaining.length > 0) {
      const medicineWithMaxDays = medicinesWithRemaining.reduce((max, med) => 
        med.remainingDays > max.remainingDays ? med : max
      )
      remainingWaitDays = medicineWithMaxDays.remainingDays
      activeBannedMedicine = {
        id: medicineWithMaxDays.id,
        name: medicineWithMaxDays.medicineName
      }
    }
  }

  // Prepare metadata for card
  const horseMetadata = {
    name: horse.name,
    yob: horse.yob,
    gender: horse.gender,
    handicapPoints: horse.handicapPoints,
    sireName: horse.sireName,
    damName: horse.damName,
    trainerName: horse.trainer?.fullName,
    currentLocation,
    locationType,
    totalRaces: horse.totalRaces,
    prizeMoney: horse.prizeMoney,
    ownerPremium: horse.ownerPremium,
    breederPremium: horse.breederPremium,
    totalEarnings: horse.totalEarnings,
    firstPlaces: horse.firstPlaces,
    secondPlaces: horse.secondPlaces,
    thirdPlaces: horse.thirdPlaces,
    fourthPlaces: horse.fourthPlaces,
    fifthPlaces: horse.fifthPlaces,
    lastRaceDate,
    lastPrizeDate,
    lastExpenseDate,
    remainingWaitDays,
    activeBannedMedicine,
    horseId: horse.id,
  }

  // Prepare pedigree data
  const pedigreeData = {
    name: horse.name,
    sireName: horse.sireName,
    damName: horse.damName,
    sireSire: horse.sireSire,
    sireDam: horse.sireDam,
    damSire: horse.damSire,
    damDam: horse.damDam,
    sireSireSire: horse.sireSireSire,
    sireSireDam: horse.sireSireDam,
    sireDamSire: horse.sireDamSire,
    sireDamDam: horse.sireDamDam,
    damSireSire: horse.damSireSire,
    damSireDam: horse.damSireDam,
    damDamSire: horse.damDamSire,
    damDamDam: horse.damDamDam,
  }

  // Prepare expenses data for chart
  const expensesData = (horse.expenses || []).map(e => ({
    date: e.date,
    amount: e.amount.toString(),
    category: e.category,
    horseId: horse.id,
    horseName: horse.name,
  }))
  return (
    <div className="pb-8">
      {/* Header with Back Button - Desktop Only */}
      <div className="hidden md:block mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {TR.common.back}
        </Button>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Mobile: Horizontal Scrollable Buttons */}
          <div className="sm:hidden relative w-full -mx-4 px-4">
            {/* Left fade gradient */}
            {showLeftFade && (
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-10" />
            )}
            
            {/* Scrollable container */}
            <div 
              ref={mobileTabsContainerRef}
              className="overflow-x-auto pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <div className="flex gap-0 min-w-max">
                {[
                  { id: 'info' as const, label: 'At Bilgisi' },
                  { id: 'pedigree' as const, label: 'Pedigri' },
                  { id: 'races' as const, label: 'Koşular' },
                  { id: 'gallops' as const, label: 'İdmanlar' },
                  { id: 'banned-medicines' as const, label: 'Çıkıcı İlaçlar' },
                  { id: 'statistics' as const, label: 'İstatistikler' },
                  { id: 'expenses' as const, label: 'Giderler' },
                  { id: 'notes' as const, label: 'Notlar' },
                ].map(({ id, label }, index, array) => {
                  const isActive = activeTab === id
                  const isFirst = index === 0
                  const isLast = index === array.length - 1
                  return (
                    <button
                      key={id}
                      ref={isActive ? activeTabButtonRef : null}
                      onClick={() => handleTabChange(id)}
                      className={`px-3 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                        isActive
                          ? `bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-md rounded-sm ${isFirst ? 'rounded-l-md' : ''} ${isLast ? 'rounded-r-md' : ''}`
                          : 'bg-white text-gray-700 hover:bg-gray-50 border-y border-l border-gray-200 first:rounded-l-md last:rounded-r-md last:border-r'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Right fade gradient */}
            {showRightFade && (
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10" />
            )}
          </div>

          {/* Desktop: Standard TabsList */}
          <div className="hidden sm:block w-full">
            <div className="flex items-center justify-between gap-4 w-full">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="inline-flex items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200/50 p-1.5 shadow-lg gap-0 min-w-max sm:min-w-0">
                  <TabsTrigger 
                    value="info"
                    className="px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50 data-[state=inactive]:border-r data-[state=inactive]:border-gray-300/50"
                  >
                    At Bilgisi
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pedigree"
                    className="px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50 data-[state=inactive]:border-r data-[state=inactive]:border-gray-300/50"
                  >
                    Pedigri
                  </TabsTrigger>
                  <TabsTrigger 
                    value="races"
                    className="px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50 data-[state=inactive]:border-r data-[state=inactive]:border-gray-300/50"
                  >
                    Koşular
                  </TabsTrigger>
                  <TabsTrigger 
                    value="gallops"
                    className="px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50 data-[state=inactive]:border-r data-[state=inactive]:border-gray-300/50"
                  >
                    İdmanlar
                  </TabsTrigger>
                  <TabsTrigger 
                    value="banned-medicines"
                    className="px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50 data-[state=inactive]:border-r data-[state=inactive]:border-gray-300/50"
                  >
                    Çıkıcı İlaçlar
                  </TabsTrigger>
                  <TabsTrigger 
                    value="statistics"
                    className="px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50 data-[state=inactive]:border-r data-[state=inactive]:border-gray-300/50"
                  >
                    İstatistikler
                  </TabsTrigger>
                  <TabsTrigger 
                    value="expenses"
                    className="px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50 data-[state=inactive]:border-r data-[state=inactive]:border-gray-300/50"
                  >
                    Giderler
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notes"
                    className="px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50"
                  >
                    Notlar
                  </TabsTrigger>
                </TabsList>
              </div>
              {activeTab === 'expenses' && (
                <div className="flex items-center gap-3">
                  <div ref={expensesFilterButtonRef} className="relative">
                    <Button 
                      size="sm"
                      onClick={() => {
                        filterTriggerRef.current?.()
                      }}
                      variant="outline"
                      className={getFilterButtonClass(expensesFilterCount > 0)}
                    >
                      <Filter className="h-4 w-4" />
                      {renderFilterBadge(expensesFilterCount)}
                    </Button>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    Ekle
                  </Button>
                </div>
              )}
            </div>
            {activeTab === 'expenses' && (
              <div className="text-right mt-2 hidden sm:block">
                <p className="text-xs uppercase tracking-wide text-gray-500">Toplam</p>
                <p className="text-lg font-semibold text-indigo-600">
                  {formatCurrency(visibleExpenseTotal, visibleExpenseCurrency)}
                </p>
              </div>
            )}
          </div>
          {/* Mobile: Expenses buttons and total */}
          {activeTab === 'expenses' && (
            <div className="sm:hidden flex flex-col gap-3 mt-4">
              <div className="flex items-center gap-3">
                <div ref={expensesFilterButtonRef} className="relative">
                  <Button 
                    size="sm"
                    onClick={() => {
                      filterTriggerRef.current?.()
                    }}
                    variant="outline"
                    className={getFilterButtonClass(expensesFilterCount > 0)}
                  >
                    <Filter className="h-4 w-4" />
                    {renderFilterBadge(expensesFilterCount)}
                  </Button>
                </div>
                <Button 
                  size="sm"
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all"
                >
                  Ekle
                </Button>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-gray-500">Toplam</p>
                <p className="text-lg font-semibold text-indigo-600">
                  {formatCurrency(visibleExpenseTotal, visibleExpenseCurrency)}
                </p>
              </div>
            </div>
          )}
          {activeTab === 'races' && (
            <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto mt-4 sm:mt-0">
              <div ref={racesFilterButtonRef} className="relative">
                <Button 
                  size="sm"
                  onClick={() => {
                    racesFilterTriggerRef.current?.()
                  }}
                  variant="outline"
                  className={getFilterButtonClass(racesFilterCount > 0)}
                >
                  <Filter className="h-4 w-4" />
                  {renderFilterBadge(racesFilterCount)}
                </Button>
              </div>
            </div>
          )}
          {activeTab === 'gallops' && (
            <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto mt-4 sm:mt-0">
              <div ref={gallopsFilterButtonRef} className="relative">
                <Button 
                  size="sm"
                  onClick={() => {
                    gallopsFilterTriggerRef.current?.()
                  }}
                  variant="outline"
                  className={getFilterButtonClass(gallopsFilterCount > 0)}
                >
                  <Filter className="h-4 w-4" />
                  {renderFilterBadge(gallopsFilterCount)}
                </Button>
              </div>
              <Button
                size="sm"
                onClick={() => setIsShowTrainingPlansModalOpen(true)}
                className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all whitespace-nowrap"
              >
                İdman Planı
              </Button>
            </div>
          )}
          {activeTab === 'statistics' && (
            <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto mt-4 sm:mt-0">
              <div ref={statisticsFilterButtonRef} className="relative">
                <Button 
                  size="sm"
                  onClick={() => {
                    statisticsFilterTriggerRef.current?.()
                  }}
                  variant="outline"
                  className={getFilterButtonClass(statisticsFilterCount > 0)}
                >
                  <Filter className="h-4 w-4" />
                  {renderFilterBadge(statisticsFilterCount)}
                </Button>
              </div>
            </div>
          )}
          {activeTab === 'notes' && (
            <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto mt-4 sm:mt-0">
              <div ref={notesFilterButtonRef} className="relative">
                <Button 
                  size="sm"
                  onClick={() => {
                    notesFilterTriggerRef.current?.()
                  }}
                  variant="outline"
                  className={getFilterButtonClass(notesFilterCount > 0)}
                >
                  <Filter className="h-4 w-4" />
                  {renderFilterBadge(notesFilterCount)}
                </Button>
              </div>
              <Button 
                size="sm"
                onClick={() => setIsNoteModalOpen(true)}
                className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all"
              >
                Ekle
              </Button>
            </div>
          )}
          {activeTab === 'banned-medicines' && (
            <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto mt-4 sm:mt-0">
              <div ref={bannedMedicinesFilterButtonRef} className="relative">
                <Button 
                  size="sm"
                  onClick={() => {
                    bannedMedicinesFilterTriggerRef.current?.()
                  }}
                  variant="outline"
                  className={getFilterButtonClass(bannedMedicinesFilterCount > 0)}
                >
                  <Filter className="h-4 w-4" />
                  {renderFilterBadge(bannedMedicinesFilterCount)}
                </Button>
              </div>
              <Button 
                size="sm"
                onClick={() => setIsBannedMedicineModalOpen(true)}
                className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all"
              >
                Ekle
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="info" className="mt-6">
          <HorseMetadataCard horse={horseMetadata} />
        </TabsContent>

        <TabsContent value="pedigree" className="mt-6">
          <PedigreeTree horse={pedigreeData} />
        </TabsContent>

        <TabsContent value="races" className="mt-6">
          <RaceHistoryTable 
            races={horse.raceHistory || []}
            gallops={horse.gallops || []}
            hideButtons={true}
            onFilterTriggerReady={(trigger) => {
              racesFilterTriggerRef.current = trigger
            }}
            showFilterDropdown={showRacesFilter}
            onFilterDropdownChange={setShowRacesFilter}
            filterDropdownContainerRef={racesFilterButtonRef}
            onActiveFiltersChange={setRacesFilterCount}
            highlightRaceId={highlightRaceId}
          />
        </TabsContent>

        <TabsContent value="gallops" className="mt-6">
          <GallopsTable 
            gallops={horse.gallops || []}
            hideButtons={true}
            horseId={horse.id}
            horseName={horse.name}
            onRefresh={fetchHorse}
            onFilterTriggerReady={(trigger) => {
              gallopsFilterTriggerRef.current = trigger
            }}
            showFilterDropdown={showGallopsFilter}
            onFilterDropdownChange={setShowGallopsFilter}
            filterDropdownContainerRef={gallopsFilterButtonRef}
            onActiveFiltersChange={setGallopsFilterCount}
            highlightGallopId={highlightGallopId}
          />
        </TabsContent>

        <TabsContent value="banned-medicines" className="mt-6">
          <BannedMedicinesTable 
            medicines={horse.bannedMedicines || []}
            horseId={horse.id}
            horseName={horse.name}
            onRefresh={fetchHorse}
            hideButtons={true}
            onFilterTriggerReady={(trigger) => {
              bannedMedicinesFilterTriggerRef.current = trigger
            }}
            showFilterDropdown={showBannedMedicinesFilter}
            onFilterDropdownChange={setShowBannedMedicinesFilter}
            filterDropdownContainerRef={bannedMedicinesFilterButtonRef}
            onActiveFiltersChange={setBannedMedicinesFilterCount}
            highlightBannedMedicineId={highlightBannedMedicineId}
          />
        </TabsContent>

        <TabsContent value="statistics" className="mt-6">
          <StatisticsCharts 
            races={horse.raceHistory || []} 
            expenses={expensesData}
            notes={horse.notes?.map((n) => ({
              id: n.id,
              date: n.date,
              kiloValue: n.kiloValue,
            })) || []}
            hideButtons={true}
            showExpenseCategoryDistribution
            onFilterTriggerReady={(trigger) => {
              statisticsFilterTriggerRef.current = trigger
            }}
            showFilterDropdown={showStatisticsFilter}
            onFilterDropdownChange={setShowStatisticsFilter}
            filterDropdownContainerRef={statisticsFilterButtonRef}
            onActiveFiltersChange={setStatisticsFilterCount}
          />
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <HorseExpensesTable 
            expenses={horse.expenses || []}
            onAddExpense={() => setIsExpenseModalOpen(true)}
            horseId={horse.id}
            horseName={horse.name}
            onRefresh={fetchHorse}
            hideButtons={true}
            onFilterTriggerReady={(trigger) => {
              filterTriggerRef.current = trigger
            }}
            showFilterDropdown={showExpensesFilter}
            onFilterDropdownChange={setShowExpensesFilter}
            filterDropdownContainerRef={expensesFilterButtonRef}
            onActiveFiltersChange={setExpensesFilterCount}
            highlightExpenseId={highlightExpenseId}
            onVisibleTotalChange={(total, currency) => {
              setVisibleExpenseTotal(total)
              setVisibleExpenseCurrency(currency)
            }}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <HorseNotesList 
            notes={horse.notes || []}
            horseId={horse.id}
            horseName={horse.name}
            onRefresh={fetchHorse}
            hideButtons={true}
            onFilterTriggerReady={(trigger) => {
              notesFilterTriggerRef.current = trigger
            }}
            showFilterDropdown={showNotesFilter}
            onFilterDropdownChange={setShowNotesFilter}
            filterDropdownContainerRef={notesFilterButtonRef}
            onActiveFiltersChange={setNotesFilterCount}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {isNoteModalOpen && (
        <AddNoteModal
          horseId={horse.id}
          horseName={horse.name}
          open={isNoteModalOpen}
          onClose={() => {
            setIsNoteModalOpen(false)
            fetchHorse() // Refresh data
          }}
        />
      )}

      {isBannedMedicineModalOpen && (
        <AddBannedMedicineModal
          horseId={horse.id}
          horseName={horse.name}
          open={isBannedMedicineModalOpen}
          onClose={() => {
            setIsBannedMedicineModalOpen(false)
            fetchHorse() // Refresh data
          }}
          onSuccess={() => {
            setIsBannedMedicineModalOpen(false)
            fetchHorse() // Refresh data
          }}
        />
      )}

      {isLocationModalOpen && (
        <ChangeLocationModal
          horseId={horse.id}
          horseName={horse.name}
          open={isLocationModalOpen}
          onClose={() => {
            setIsLocationModalOpen(false)
            fetchHorse() // Refresh data
          }}
        />
      )}

      {isExpenseModalOpen && (
        <AddExpenseModal
          open={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          preselectedHorseId={horse.id}
          preselectedHorseName={horse.name}
          onSuccess={() => {
            setIsExpenseModalOpen(false)
            fetchHorse()
          }}
        />
      )}

      {isShowTrainingPlansModalOpen && (
        <ShowTrainingPlansModal
          open={isShowTrainingPlansModalOpen}
          onClose={() => setIsShowTrainingPlansModalOpen(false)}
          horseId={horse.id}
          horseName={horse.name}
          onRefresh={fetchHorse}
        />
      )}
    </div>
  )
}
