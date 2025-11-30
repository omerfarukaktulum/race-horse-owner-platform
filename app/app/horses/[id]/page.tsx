'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { ArrowLeft, FileText, MapPin, Filter, Plus, NotebookPen, BarChart3, Layers, Ruler, Users, Flag, TurkishLira, Menu, X, Info, Stethoscope, Pill, Wallet } from 'lucide-react'
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
import { HorseIllnessesTable } from '@/app/components/horse-detail/HorseIllnessesTable'
import { BannedMedicinesTable } from '@/app/components/horse-detail/BannedMedicinesTable'
import { AddIllnessModal } from '@/app/components/modals/add-illness-modal'
import { formatCurrency } from '@/lib/utils/format'

interface LocationHistory {
  id: string
  startDate: string
  endDate: string | null
  locationType: string
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

const HORSE_TABS = ['info', 'pedigree', 'races', 'gallops', 'statistics', 'illnesses', 'banned-medicines', 'expenses', 'notes'] as const
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
  illnesses?: Array<{
    id: string
    startDate: string
    endDate?: string | null
    detail?: string | null
    photoUrl?: string | string[]
    addedById: string
    addedBy: {
      email: string
      role: string
      ownerProfile?: { officialName: string }
      trainerProfile?: { fullName: string }
      name?: string
    }
    operations?: Array<{
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
    }>
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
  const [isIllnessModalOpen, setIsIllnessModalOpen] = useState(false)
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
  const [illnessesFilterCount, setIllnessesFilterCount] = useState(0)
  const [showIllnessesFilter, setShowIllnessesFilter] = useState(false)
  const [bannedMedicinesFilterCount, setBannedMedicinesFilterCount] = useState(0)
  const [showBannedMedicinesFilter, setShowBannedMedicinesFilter] = useState(false)
  const [visibleExpenseTotal, setVisibleExpenseTotal] = useState(0)
  const [visibleExpenseCurrency, setVisibleExpenseCurrency] = useState('TRY')
  const [statisticsCategory, setStatisticsCategory] = useState<'genel' | 'pist' | 'mesafe' | 'sehir' | 'jokey' | 'kosu-turu' | 'gelir-gider'>('genel')
  const [isTabsMenuOpen, setIsTabsMenuOpen] = useState(false)
  const tabsMenuRef = useRef<HTMLDivElement>(null)
  const fabButtonRef = useRef<HTMLButtonElement>(null)
  const filterTriggerRef = useRef<(() => void) | null>(null)
  const highlightGallopId = searchParams?.get('highlightGallop') || undefined
  const highlightRaceId = searchParams?.get('highlightRace') || undefined
  const highlightExpenseId = searchParams?.get('highlightExpense') || undefined
  const highlightBannedMedicineId = searchParams?.get('highlightBannedMedicine') || undefined
  const highlightNoteId = searchParams?.get('highlightNote') || undefined

  useEffect(() => {
    const tabParam = searchParams?.get('tab')
    if (isHorseTab(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Scroll to top when activeTab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeTab])

  // Close tabs menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement
      if (
        isTabsMenuOpen &&
        tabsMenuRef.current &&
        !tabsMenuRef.current.contains(target) &&
        fabButtonRef.current &&
        !fabButtonRef.current.contains(target)
      ) {
        setIsTabsMenuOpen(false)
      }
    }

    if (isTabsMenuOpen) {
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
  }, [isTabsMenuOpen])

  const handleTabChange = (value: string) => {
    if (isHorseTab(value)) {
      // Update URL to reflect tab change, but preserve highlight parameters
      const params = new URLSearchParams(searchParams?.toString() || '')
      params.set('tab', value)
      // Keep highlight parameters if they exist
      router.replace(`/app/horses/${horseId}?${params.toString()}`, { scroll: false })
      // The useEffect will update activeTab when the URL changes
      // Close menu on mobile after tab change
      setIsTabsMenuOpen(false)
      // Scroll to top when tab changes
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  const notesFilterTriggerRef = useRef<(() => void) | null>(null)
  const statisticsFilterTriggerRef = useRef<(() => void) | null>(null)
  const racesFilterTriggerRef = useRef<(() => void) | null>(null)
  const gallopsFilterTriggerRef = useRef<(() => void) | null>(null)
  const bannedMedicinesFilterTriggerRef = useRef<(() => void) | null>(null)
  const expensesFilterButtonRef = useRef<HTMLDivElement>(null)
  const notesFilterButtonRef = useRef<HTMLDivElement>(null)
  const illnessesFilterButtonRef = useRef<HTMLDivElement>(null)
  const illnessesFilterTriggerRef = useRef<(() => void) | null>(null)
  const statisticsFilterButtonRef = useRef<HTMLDivElement>(null)
  const racesFilterButtonRef = useRef<HTMLDivElement>(null)
  const gallopsFilterButtonRef = useRef<HTMLDivElement>(null)
  const bannedMedicinesFilterButtonRef = useRef<HTMLDivElement>(null)

  const getFilterButtonClass = (hasActive: boolean) =>
    `border-2 font-medium px-3 h-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
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

      // All data (notes, illnesses, banned medicines) is now included in the main query
      setHorse(data.horse)
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
  // Get current location from locationHistory first, then fallback to racecourse/farm
  const currentLocationHistory = horse.locationHistory && horse.locationHistory.length > 0 
    ? horse.locationHistory.find(loc => !loc.endDate) || horse.locationHistory[0]
    : null
  
  const currentLocation = currentLocationHistory 
    ? (currentLocationHistory.racecourse?.name || currentLocationHistory.farm?.name)
    : (horse.racecourse?.name || horse.farm?.name)
  
  // Determine locationType - check locationHistory first, then fallback
  let locationType: 'racecourse' | 'farm' | undefined = undefined
  if (currentLocationHistory) {
    if (currentLocationHistory.locationType === 'racecourse' || currentLocationHistory.racecourse) {
      locationType = 'racecourse'
    } else if (currentLocationHistory.locationType === 'farm' || currentLocationHistory.farm) {
      locationType = 'farm'
    }
  } else {
    if (horse.racecourse) {
      locationType = 'racecourse'
    } else if (horse.farm) {
      locationType = 'farm'
    }
  }
  
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

  // Find active illnesses (where endDate is null)
  const activeIllnesses = horse.illnesses
    ? horse.illnesses
        .filter(illness => !illness.endDate)
        .map(illness => ({
          id: illness.id,
          detail: illness.detail || '',
          startDate: illness.startDate,
          operationsCount: illness.operations?.length || 0,
        }))
    : []

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
    activeIllnesses,
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
                    value="statistics"
              className="px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50 data-[state=inactive]:border-r data-[state=inactive]:border-gray-300/50"
            >
                    İstatistikler
            </TabsTrigger>
            <TabsTrigger 
                    value="illnesses"
              className="px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50 data-[state=inactive]:border-r data-[state=inactive]:border-gray-300/50"
            >
                    Hastalıklar
                  </TabsTrigger>
                  <TabsTrigger 
                    value="banned-medicines"
                    className="px-3 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-300 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50 data-[state=inactive]:border-r data-[state=inactive]:border-gray-300/50"
                  >
                    Çıkıcı İlaçlar
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
            </div>
            
            {/* Desktop: Filter and Action Buttons - Below Tabs, Same Line */}
            {(activeTab === 'illnesses' || activeTab === 'notes' || activeTab === 'gallops' || activeTab === 'races' || activeTab === 'statistics' || activeTab === 'banned-medicines' || activeTab === 'expenses') && (
            <div className={`hidden sm:flex ${activeTab === 'expenses' ? 'items-start' : 'items-center'} justify-between mt-6`}>
              {/* Left side: Filter buttons */}
              <div className={`flex ${activeTab === 'expenses' ? 'items-start' : 'items-center'} gap-3`}>
          {activeTab === 'illnesses' && (
              <div ref={illnessesFilterButtonRef} className="relative">
                <Button 
                  onClick={() => {
                    illnessesFilterTriggerRef.current?.()
                  }}
                  variant="outline"
                  className={getFilterButtonClass(illnessesFilterCount > 0)}
                >
                  <Filter className="h-4 w-4" />
                  {renderFilterBadge(illnessesFilterCount)}
                </Button>
              </div>
                )}
                {activeTab === 'notes' && (
                  <div ref={notesFilterButtonRef} className="relative">
              <Button 
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
          )}
                {activeTab === 'gallops' && (
                  <div ref={gallopsFilterButtonRef} className="relative">
                  <Button 
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
                )}
                {activeTab === 'races' && (
                  <div ref={racesFilterButtonRef} className="relative">
                <Button 
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
          )}
                {activeTab === 'statistics' && (
                  <div ref={statisticsFilterButtonRef} className="relative">
                <Button 
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
          )}
          {activeTab === 'banned-medicines' && (
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
          )}
                {activeTab === 'expenses' && (
                  <div ref={expensesFilterButtonRef} className="relative">
                <Button 
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
                )}
            </div>
              
              {/* Right side: Action buttons */}
              <div className="flex items-center gap-3">
                {activeTab === 'expenses' && (
                  <Button 
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="h-10 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    Ekle
                  </Button>
                )}
                {activeTab === 'notes' && (
                  <Button 
                    onClick={() => setIsNoteModalOpen(true)}
                    className="h-10 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    Ekle
                  </Button>
                )}
                {activeTab === 'illnesses' && (
                  <Button 
                    onClick={() => setIsIllnessModalOpen(true)}
                    className="h-10 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    Ekle
                  </Button>
                )}
                {activeTab === 'gallops' && (
              <Button
                onClick={() => setIsShowTrainingPlansModalOpen(true)}
                className="h-10 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all whitespace-nowrap"
              >
                İdman Planı
              </Button>
                )}
                {activeTab === 'banned-medicines' && (
                  <Button 
                    onClick={() => setIsBannedMedicineModalOpen(true)}
                    className="h-10 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    Ekle
                  </Button>
                )}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Mobile: Scrollable Content Area */}
        <div className={`md:hidden ${activeTab === 'statistics' ? 'pt-0 pb-0' : 'pt-0 pb-8'}`} style={activeTab === 'statistics' ? {} : { paddingBottom: 'calc(5rem + var(--bottom-tab-bar-height, 73px))' }}>
          <TabsContent value="info" className="mt-4">
            <HorseMetadataCard horse={horseMetadata} />
          </TabsContent>

          <TabsContent value="pedigree" className="mt-4">
            <PedigreeTree horse={pedigreeData} />
          </TabsContent>

          <TabsContent value="races" className="mt-0">
            <RaceHistoryTable 
              races={horse.raceHistory || []}
              gallops={horse.gallops || []}
              hideButtons={false}
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

          <TabsContent value="gallops" className="mt-0">
            <GallopsTable 
              gallops={horse.gallops || []}
              hideButtons={false}
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

          <TabsContent value="banned-medicines" className="mt-0">
            <BannedMedicinesTable 
              medicines={horse.bannedMedicines || []}
              horseId={horse.id}
              horseName={horse.name}
              onRefresh={fetchHorse}
              hideButtons={false}
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

          <TabsContent value="statistics" className="mt-0">
            <StatisticsCharts 
              races={horse.raceHistory || []} 
              expenses={expensesData}
              notes={horse.notes?.map((n) => ({
                id: n.id,
                date: n.date,
                kiloValue: n.kiloValue,
              })) || []}
              hideButtons={false}
              showExpenseCategoryDistribution
              selectedCategory={statisticsCategory}
              onCategoryChange={setStatisticsCategory}
              onFilterTriggerReady={(trigger) => {
                statisticsFilterTriggerRef.current = trigger
              }}
              showFilterDropdown={showStatisticsFilter}
              onFilterDropdownChange={setShowStatisticsFilter}
              filterDropdownContainerRef={statisticsFilterButtonRef}
              onActiveFiltersChange={setStatisticsFilterCount}
            />
          </TabsContent>

          <TabsContent value="illnesses" className="mt-0">
            <HorseIllnessesTable 
              illnesses={horse.illnesses || []}
              horseId={horse.id}
              horseName={horse.name}
              onRefresh={fetchHorse}
              hideButtons={false}
              onFilterTriggerReady={(trigger) => {
                illnessesFilterTriggerRef.current = trigger
              }}
              showFilterDropdown={showIllnessesFilter}
              onFilterDropdownChange={setShowIllnessesFilter}
              filterDropdownContainerRef={illnessesFilterButtonRef}
              onActiveFiltersChange={setIllnessesFilterCount}
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-0">
            <HorseExpensesTable 
              expenses={horse.expenses || []}
              onAddExpense={() => setIsExpenseModalOpen(true)}
              horseId={horse.id}
              horseName={horse.name}
              onRefresh={fetchHorse}
              hideButtons={false}
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

          <TabsContent value="notes" className="mt-0">
            <HorseNotesList 
              notes={horse.notes || []}
              horseId={horse.id}
              horseName={horse.name}
              onRefresh={fetchHorse}
              hideButtons={false}
              onFilterTriggerReady={(trigger) => {
                notesFilterTriggerRef.current = trigger
              }}
              showFilterDropdown={showNotesFilter}
              onFilterDropdownChange={setShowNotesFilter}
              filterDropdownContainerRef={notesFilterButtonRef}
              onActiveFiltersChange={setNotesFilterCount}
              highlightNoteId={highlightNoteId}
              onAddNote={() => setIsNoteModalOpen(true)}
            />
          </TabsContent>
        </div>

        {/* Desktop: Content Area */}
        <div className="hidden md:block">
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
            selectedCategory={statisticsCategory}
            onCategoryChange={setStatisticsCategory}
            onFilterTriggerReady={(trigger) => {
              statisticsFilterTriggerRef.current = trigger
            }}
            showFilterDropdown={showStatisticsFilter}
            onFilterDropdownChange={setShowStatisticsFilter}
            filterDropdownContainerRef={statisticsFilterButtonRef}
            onActiveFiltersChange={setStatisticsFilterCount}
          />
        </TabsContent>

        <TabsContent value="illnesses" className="mt-6">
          <HorseIllnessesTable 
            illnesses={horse.illnesses || []}
            horseId={horse.id}
            horseName={horse.name}
            onRefresh={fetchHorse}
            hideButtons={true}
            onFilterTriggerReady={(trigger) => {
              illnessesFilterTriggerRef.current = trigger
            }}
            showFilterDropdown={showIllnessesFilter}
            onFilterDropdownChange={setShowIllnessesFilter}
            filterDropdownContainerRef={illnessesFilterButtonRef}
            onActiveFiltersChange={setIllnessesFilterCount}
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
            highlightNoteId={highlightNoteId}
            onAddNote={() => setIsNoteModalOpen(true)}
          />
        </TabsContent>
        </div>
      </Tabs>

      {/* Mobile: FAB Button with Tabs Menu - Always visible, positioned at bottom when no + FAB, above + FAB on expenses/notes/gallops/banned-medicines/illnesses tabs */}
      <div 
        className="md:hidden fixed right-4 z-40" 
        style={{ 
          bottom: (activeTab === 'expenses' || activeTab === 'notes' || activeTab === 'gallops' || activeTab === 'banned-medicines' || activeTab === 'illnesses')
            ? 'calc(var(--bottom-tab-bar-height, 73px) + 4.5rem)' // Above + FAB
            : 'calc(var(--bottom-tab-bar-height, 73px) + 1rem)' // At bottom position
        }}
      >
        {/* Tabs Menu Popover */}
        {isTabsMenuOpen && (
          <div
            ref={tabsMenuRef}
            className="absolute right-0 bottom-full mb-2 min-w-max bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200/50 p-2 animate-in z-40"
          >
            <div className="flex flex-col gap-1">
              {[
                { id: 'info' as const, label: 'At Bilgisi', icon: Info },
                { id: 'pedigree' as const, label: 'Pedigri', icon: FileText },
                { id: 'races' as const, label: 'Koşular', icon: Flag },
                { id: 'gallops' as const, label: 'İdmanlar', icon: Ruler },
                { id: 'statistics' as const, label: 'İstatistikler', icon: BarChart3 },
                { id: 'illnesses' as const, label: 'Hastalıklar', icon: Stethoscope },
                { id: 'banned-medicines' as const, label: 'Çıkıcı İlaçlar', icon: Pill },
                { id: 'expenses' as const, label: 'Giderler', icon: Wallet },
                { id: 'notes' as const, label: 'Notlar', icon: NotebookPen },
              ].map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id
                return (
                  <button
                    key={id}
                    onClick={() => handleTabChange(id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* FAB Button */}
        <Button
          ref={fabButtonRef}
          onClick={() => setIsTabsMenuOpen(!isTabsMenuOpen)}
          className="h-12 w-12 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center p-0 fab-button"
        >
          {isTabsMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile: + FAB for Gallops (İdmanlar) */}
      {activeTab === 'gallops' && (
        <Button
          onClick={() => setIsShowTrainingPlansModalOpen(true)}
          className="md:hidden fixed right-4 z-40 h-12 w-12 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center p-0 fab-button"
          style={{ bottom: 'calc(var(--bottom-tab-bar-height, 73px) + 1rem)' }}
        >
          <NotebookPen className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile: + FAB for Banned Medicines (Çıkıcı İlaçlar) */}
      {activeTab === 'banned-medicines' && (
        <Button
          onClick={() => setIsBannedMedicineModalOpen(true)}
          className="md:hidden fixed right-4 z-40 h-12 w-12 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center p-0 fab-button"
          style={{ bottom: 'calc(var(--bottom-tab-bar-height, 73px) + 1rem)' }}
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile: + FAB for Illnesses (Hastalıklar) */}
      {activeTab === 'illnesses' && (
        <Button
          onClick={() => setIsIllnessModalOpen(true)}
          className="md:hidden fixed right-4 z-40 h-12 w-12 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center p-0 fab-button"
          style={{ bottom: 'calc(var(--bottom-tab-bar-height, 73px) + 1rem)' }}
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}

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

      {isIllnessModalOpen && (
        <AddIllnessModal
          horseId={horse.id}
          horseName={horse.name}
          open={isIllnessModalOpen}
          onClose={() => {
            setIsIllnessModalOpen(false)
            fetchHorse() // Refresh data
          }}
          onSuccess={() => {
            setIsIllnessModalOpen(false)
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
