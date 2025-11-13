'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Plus, Edit2, Activity } from 'lucide-react' // Activity still used in empty states
import { TR } from '@/lib/constants/tr'
import { toast } from 'sonner'
import { formatDate, formatCurrency, getRelativeTime } from '@/lib/utils/format'
import { AddExpenseModal } from '@/app/components/modals/add-expense-modal'
import { ChangeLocationModal } from '@/app/components/modals/change-location-modal'

interface HorseData {
  id: string
  name: string
  yob?: number
  status: string
  gender?: string
  racecourse?: { id: string; name: string }
  farm?: { id: string; name: string; city?: string }
  trainer?: { fullName: string }
  groomName?: string
  handicapPoints?: number
  sireName?: string
  damName?: string
  currentLocationType?: 'racecourse' | 'farm'
  currentCity?: string
  expenses: Array<{
    date: Date
    amount: number
    currency: string
  }>
}

export default function HorsesPage() {
  const [horses, setHorses] = useState<HorseData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ACTIVE')
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [selectedHorseForExpense, setSelectedHorseForExpense] = useState<string | null>(null)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [selectedHorseForLocation, setSelectedHorseForLocation] = useState<HorseData | null>(null)

  useEffect(() => {
    fetchHorses()
  }, [])

  const fetchHorses = async () => {
    try {
      console.log('[Horses Page] Fetching horses...')
      const response = await fetch('/api/horses')
      const data = await response.json()

      console.log('[Horses Page] Response status:', response.status)
      console.log('[Horses Page] Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Atlar yüklenemedi')
      }

      console.log('[Horses Page] Setting', data.horses?.length || 0, 'horses')
      setHorses(data.horses || [])
    } catch (error) {
      console.error('Fetch horses error:', error)
      toast.error('Atlar yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const filterHorses = (tab: string) => {
    const currentYear = new Date().getFullYear()
    let filtered: HorseData[] = []
    
    if (tab === 'ACTIVE') {
      filtered = horses.filter((horse) => horse.status === 'RACING')
    } else if (tab === 'FOALS') {
      // Foals: 0, 1, 2, 3 years old (exclude dead horses)
      filtered = horses.filter((horse) => {
        if (!horse.yob) return false
        if (horse.status === 'DEAD') return false // Don't show dead foals in Taylar tab
        const age = currentYear - horse.yob
        return age >= 0 && age <= 3
      })
    } else if (tab === 'MARE') {
      filtered = horses.filter((horse) => {
        // Include horses with MARE status
        if (horse.status === 'MARE') return true
        
        // Also include girl horses (Dişi) over 7 years old
        if (horse.yob && horse.gender) {
          const age = currentYear - horse.yob
          const isGirl = horse.gender.includes('Dişi') || horse.gender.includes('DİŞİ') || 
                        horse.gender.includes('Kısrak') || horse.gender.includes('KISRAK')
          if (age > 7 && isGirl) return true
        }
        
        return false
      })
    } else if (tab === 'DEAD') {
      filtered = horses.filter((horse) => horse.status === 'DEAD')
    }
    
    // Sort by age ascending (youngest first), then alphabetically by name
    return filtered.sort((a, b) => {
      const ageA = a.yob ? currentYear - a.yob : 999
      const ageB = b.yob ? currentYear - b.yob : 999
      
      // First sort by age
      if (ageA !== ageB) {
        return ageA - ageB
      }
      
      // If ages are the same, sort alphabetically by name
      return a.name.localeCompare(b.name, 'tr')
    })
  }

  const HorseCard = ({ horse }: { horse: HorseData }) => {
    const lastExpense = horse.expenses[0]
    const age = horse.yob ? new Date().getFullYear() - horse.yob : null

    // Determine if horse is male or female
    const isMale = horse.gender?.includes('Erkek') || horse.gender?.includes('ERKEK') || 
                   horse.gender?.includes('Aygır') || horse.gender?.includes('AYGIR')
    const isFemale = horse.gender?.includes('Dişi') || horse.gender?.includes('DİŞİ') || 
                     horse.gender?.includes('Kısrak') || horse.gender?.includes('KISRAK')

    // Card gradient based on gender - Purple/Violet for females instead of pink
    const cardGradient = isMale 
      ? 'bg-gradient-to-br from-blue-50 via-sky-50 to-white border border-blue-100'
      : isFemale
      ? 'bg-gradient-to-br from-purple-50 via-violet-50 to-white border border-purple-100'
      : 'bg-gradient-to-br from-slate-50 via-gray-50 to-white border border-gray-100'

    // Button gradient based on gender
    const buttonGradient = isMale
      ? 'bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700'
      : isFemale
      ? 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700'
      : 'bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700'

    // Age badge color
    const ageBadgeColor = isMale
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : isFemale
      ? 'bg-purple-100 text-purple-700 border-purple-200'
      : 'bg-gray-100 text-gray-700 border-gray-200'

    // Get gender label
    const getGenderLabel = () => {
      if (!horse.gender) return null
      if (isMale) {
        return { text: 'Erkek', color: 'bg-blue-100 text-blue-700 border-blue-200' }
      }
      if (isFemale) {
        return { text: 'Dişi', color: 'bg-purple-100 text-purple-700 border-purple-200' }
      }
      return null
    }

    const genderLabel = getGenderLabel()

    // Get status label (only for STALLION and MARE, exclude RACING and DEAD)
    const getStatusLabel = () => {
      switch (horse.status) {
        case 'STALLION':
          return { text: 'Aygır', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' }
        case 'MARE':
          return { text: 'Kısrak', color: 'bg-purple-100 text-purple-700 border-purple-200' }
        default:
          return null
      }
    }

    const statusLabel = getStatusLabel()

    return (
      <Link href={`/app/horses/${horse.id}`}>
        <Card className={`p-4 sm:p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 shadow-lg cursor-pointer ${cardGradient}`}>
          {/* Horse Name and Origin - First Line */}
          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-1">
                {horse.name}
                {(horse.sireName || horse.damName) && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    - {horse.sireName && horse.damName 
                      ? `${horse.sireName} - ${horse.damName}`
                      : horse.sireName || horse.damName}
                  </span>
                )}
              </h3>
            </div>
            
            {/* All Labels Side by Side - Second Line */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {age !== null && (
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                  {age} yaş{horse.yob ? ` (${horse.yob})` : ''}
                </span>
              )}
              {genderLabel && (
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${genderLabel.color}`}>
                  {genderLabel.text}
                </span>
              )}
              {statusLabel && (
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${statusLabel.color}`}>
                  {statusLabel.text}
                </span>
              )}
              {horse.handicapPoints !== null && horse.handicapPoints !== undefined && (
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                  Hand: {horse.handicapPoints}
                </span>
              )}
              {horse.status === 'RACING' && horse.racecourse && (
                <span className="px-2.5 py-1 rounded-md text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                  🏇 {horse.racecourse.name}
                </span>
              )}
              {horse.trainer && (
                <span className="px-2.5 py-1 rounded-md text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-200">
                  👤 {horse.trainer.fullName}
                </span>
              )}
              {horse.groomName && (
                <span className="px-2.5 py-1 rounded-md text-xs font-medium border bg-teal-50 text-teal-700 border-teal-200">
                  🧑‍🌾 {horse.groomName}
                </span>
              )}
              {(horse.status === 'STALLION' || horse.status === 'MARE') && horse.farm && (
                <span className="px-2.5 py-1 rounded-md text-xs font-medium border bg-green-50 text-green-700 border-green-200">
                  🏡 {horse.farm.name}
                </span>
              )}
            </div>

            {/* Last Expense */}
            {lastExpense && (
              <div className="pt-3 border-t border-white/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-medium">Son Gider</span>
                  <span className="text-xs text-gray-500">
                    {getRelativeTime(new Date(lastExpense.date))}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(Number(lastExpense.amount), lastExpense.currency)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button 
              className={`${buttonGradient} shadow-lg hover:shadow-xl text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg flex-1 transition-all duration-300 text-sm sm:text-base`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setSelectedHorseForExpense(horse.id)
                setExpenseModalOpen(true)
              }}
            >
              Gider Ekle
            </Button>
            <Button 
              variant="outline"
              className="shadow-lg hover:shadow-xl font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg flex-1 transition-all duration-300 text-sm sm:text-base border-gray-300 hover:bg-gray-50"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setSelectedHorseForLocation(horse)
                setLocationModalOpen(true)
              }}
            >
              Konum Değiştir
            </Button>
          </div>
        </Card>
      </Link>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
          </div>
          <p className="text-gray-900 font-bold text-lg">{TR.common.loading}</p>
          <p className="text-sm text-gray-600 mt-2">Atlar yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
          {TR.horses.title}
        </h1>
        <Link href="/app/horses/new">
          <Button className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <Plus className="h-4 w-4 mr-2" />
            {TR.horses.addHorse}
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-white/90 backdrop-blur-sm border border-gray-200 p-1">
          <TabsTrigger 
            value="ACTIVE"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white font-medium transition-all"
          >
            {TR.horses.active} ({filterHorses('ACTIVE').length})
          </TabsTrigger>
          <TabsTrigger 
            value="FOALS"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white font-medium transition-all"
          >
            {TR.horses.foals} ({filterHorses('FOALS').length})
          </TabsTrigger>
          <TabsTrigger 
            value="MARE"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white font-medium transition-all"
          >
            {TR.horses.mares} ({filterHorses('MARE').length})
          </TabsTrigger>
          <TabsTrigger 
            value="DEAD"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white font-medium transition-all"
          >
            {TR.horses.dead} ({filterHorses('DEAD').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ACTIVE" className="space-y-4 mt-6">
          {filterHorses('ACTIVE').length === 0 ? (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">Aktif atınız bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {filterHorses('ACTIVE').map((horse) => (
                <HorseCard key={horse.id} horse={horse} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="FOALS" className="space-y-4 mt-6">
          {filterHorses('FOALS').length === 0 ? (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">Tay atınız bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {filterHorses('FOALS').map((horse) => (
                <HorseCard key={horse.id} horse={horse} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="MARE" className="space-y-4 mt-6">
          {filterHorses('MARE').length === 0 ? (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">Kısrak atınız bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {filterHorses('MARE').map((horse) => (
                <HorseCard key={horse.id} horse={horse} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="DEAD" className="space-y-4 mt-6">
          {filterHorses('DEAD').length === 0 ? (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">Ölü atınız bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {filterHorses('DEAD').map((horse) => (
                <HorseCard key={horse.id} horse={horse} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddExpenseModal
        open={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false)
          setSelectedHorseForExpense(null)
        }}
        preselectedHorseId={selectedHorseForExpense || undefined}
        preselectedHorseName={selectedHorseForExpense ? horses.find(h => h.id === selectedHorseForExpense)?.name : undefined}
        onSuccess={() => {
          fetchHorses()
        }}
      />

      {selectedHorseForLocation && (
        <ChangeLocationModal
          open={locationModalOpen}
          onClose={() => {
            setLocationModalOpen(false)
            setSelectedHorseForLocation(null)
          }}
          horseId={selectedHorseForLocation.id}
          horseName={selectedHorseForLocation.name}
          currentLocationType={selectedHorseForLocation.currentLocationType}
          currentCity={selectedHorseForLocation.currentCity}
          currentRacecourseId={selectedHorseForLocation.racecourse?.id}
          currentFarmId={selectedHorseForLocation.farm?.id}
          onSuccess={() => {
            fetchHorses()
          }}
        />
      )}
    </div>
  )
}

