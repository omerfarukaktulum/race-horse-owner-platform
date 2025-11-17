'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { ArrowLeft, FileText, MapPin, Filter, Plus } from 'lucide-react'
import { TR } from '@/lib/constants/tr'
import { toast } from 'sonner'
import { AddNoteModal } from '@/app/components/modals/add-note-modal'
import { AddExpenseModal } from '@/app/components/modals/add-expense-modal'
import { ChangeLocationModal } from '@/app/components/modals/change-location-modal'
import { HorseMetadataCard } from '@/app/components/horse-detail/HorseMetadataCard'
import { StatisticsCharts } from '@/app/components/horse-detail/StatisticsCharts'
import { PedigreeTree } from '@/app/components/horse-detail/PedigreeTree'
import { RaceHistoryTable } from '@/app/components/horse-detail/RaceHistoryTable'
import { GallopsTable } from '@/app/components/horse-detail/GallopsTable'
import { HorseExpensesTable } from '@/app/components/horse-detail/HorseExpensesTable'
import { HorseNotesList } from '@/app/components/horse-detail/HorseNotesList'

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
    addedBy: {
      email: string
      role: string
    }
  }>
  notes?: Array<{
    id: string
    date: string
    note: string
    photoUrl?: string | string[]
    addedBy: {
      email: string
      role: string
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
}

export default function HorseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const horseId = params?.id as string

  const [horse, setHorse] = useState<HorseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const filterTriggerRef = useRef<(() => void) | null>(null)
  const notesFilterTriggerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (horseId) {
      fetchHorse()
    }
  }, [horseId])

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
  }))

  return (
    <div className="space-y-8 pb-8">
      {/* Header with Back Button and Action Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <TabsList className="inline-flex items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200/50 p-1.5 shadow-lg gap-1.5">
            <TabsTrigger 
              value="info"
              className="px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50"
            >
              At Bilgisi
            </TabsTrigger>
            <TabsTrigger 
              value="pedigree"
              className="px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50"
            >
              Pedigri
            </TabsTrigger>
            <TabsTrigger 
              value="races"
              className="px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50"
            >
              Koşu Geçmişi
            </TabsTrigger>
            <TabsTrigger 
              value="gallops"
              className="px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50"
            >
              İdmanlar
            </TabsTrigger>
            <TabsTrigger 
              value="statistics"
              className="px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50"
            >
              İstatistikler
            </TabsTrigger>
            <TabsTrigger 
              value="expenses"
              className="px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50"
            >
              Giderler
            </TabsTrigger>
            <TabsTrigger 
              value="notes"
              className="px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50"
            >
              Notlar
            </TabsTrigger>
          </TabsList>
          {activeTab === 'expenses' && (
            <div className="flex items-center gap-2 ml-auto">
              <Button 
                onClick={() => {
                  filterTriggerRef.current?.()
                }}
                variant="outline"
                className="h-[42px] px-6 text-sm font-medium rounded-md border-2 border-gray-300 text-gray-700 hover:border-gray-400 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtrele
              </Button>
              <Button 
                onClick={() => setIsExpenseModalOpen(true)}
                className="h-[42px] px-6 text-sm font-medium rounded-md bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Gider Ekle
              </Button>
            </div>
          )}
          {activeTab === 'notes' && (
            <div className="flex items-center gap-2 ml-auto">
              <Button 
                onClick={() => {
                  notesFilterTriggerRef.current?.()
                }}
                variant="outline"
                className="h-[42px] px-6 text-sm font-medium rounded-md border-2 border-gray-300 text-gray-700 hover:border-gray-400 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtrele
              </Button>
              <Button 
                onClick={() => setIsNoteModalOpen(true)}
                className="h-[42px] px-6 text-sm font-medium rounded-md bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <FileText className="h-4 w-4 mr-2" />
                Not Ekle
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
          <RaceHistoryTable races={horse.raceHistory || []} />
        </TabsContent>

        <TabsContent value="gallops" className="mt-6">
          <GallopsTable gallops={horse.gallops || []} />
        </TabsContent>

        <TabsContent value="statistics" className="mt-6">
          <StatisticsCharts 
            races={horse.raceHistory || []} 
            expenses={expensesData}
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
    </div>
  )
}
