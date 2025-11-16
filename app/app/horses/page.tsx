'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Plus, LayoutGrid, FileText, Filter, X, TurkishLira, MapPin, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TR } from '@/lib/constants/tr'
import { toast } from 'sonner'
import { formatDate, formatCurrency, getRelativeTime } from '@/lib/utils/format'
import { AddExpenseModal } from '@/app/components/modals/add-expense-modal'
import { ChangeLocationModal } from '@/app/components/modals/change-location-modal'
import { AddNoteModal } from '@/app/components/modals/add-note-modal'

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
    createdAt: Date
  }>
}

export default function HorsesPage() {
  const [horses, setHorses] = useState<HorseData[]>([])
  const [allHorses, setAllHorses] = useState<HorseData[]>([]) // Store all horses for filtering
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ACTIVE')
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [selectedHorseForExpense, setSelectedHorseForExpense] = useState<string | null>(null)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [selectedHorseForLocation, setSelectedHorseForLocation] = useState<HorseData | null>(null)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [selectedHorseForNote, setSelectedHorseForNote] = useState<HorseData | null>(null)
  const [ageFilters, setAgeFilters] = useState<number[]>([])
  const [genderFilters, setGenderFilters] = useState<string[]>([])
  const [locationFilters, setLocationFilters] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'age-asc' | 'age-desc' | 'name-asc' | 'name-desc' | null>(null)
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchHorses()
  }, [])

  // Filter horses based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setHorses(allHorses)
    } else {
      const query = searchQuery.toLowerCase().trim()
      const filtered = allHorses.filter((horse) => {
        // Search in horse name
        if (horse.name.toLowerCase().includes(query)) {
          return true
        }
        // Search in sire name
        if (horse.sireName && horse.sireName.toLowerCase().includes(query)) {
          return true
        }
        // Search in dam name
        if (horse.damName && horse.damName.toLowerCase().includes(query)) {
          return true
        }
        return false
      })
      setHorses(filtered)
    }
  }, [searchQuery, allHorses])

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showFilters && !target.closest('.filter-dropdown-container')) {
        setShowFilters(false)
      }
      if (showSortDropdown && !target.closest('.sort-dropdown-container')) {
        setShowSortDropdown(false)
      }
    }

    if (showFilters || showSortDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilters, showSortDropdown])

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
      const fetchedHorses = data.horses || []
      setAllHorses(fetchedHorses)
      setHorses(fetchedHorses)
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
      // Hepsi: Show all horses (excluding only DEAD horses)
      filtered = horses.filter((horse) => horse.status !== 'DEAD')
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
    
    // Apply age filters (multiple selection)
    if (ageFilters.length > 0) {
      filtered = filtered.filter((horse) => {
        if (!horse.yob) return false
        const age = currentYear - horse.yob
        // Check if exact age is selected
        if (ageFilters.includes(age)) return true
        // Check if 7+ is selected and age is 7 or older
        if (ageFilters.includes(7) && age >= 7) return true
        return false
      })
    }
    
    // Apply gender filters (multiple selection)
    if (genderFilters.length > 0) {
      filtered = filtered.filter((horse) => {
        if (!horse.gender) return false
        const isMale = horse.gender.includes('Erkek') || horse.gender.includes('ERKEK') || 
                      horse.gender.includes('Aygır') || horse.gender.includes('AYGIR')
        const isFemale = horse.gender.includes('Dişi') || horse.gender.includes('DİŞİ') || 
                         horse.gender.includes('Kısrak') || horse.gender.includes('KISRAK')
        
        if (genderFilters.includes('male') && isMale) return true
        if (genderFilters.includes('female') && isFemale) return true
        return false
      })
    }
    
    // Apply location filters (multiple selection)
    if (locationFilters.length > 0) {
      filtered = filtered.filter((horse) => {
        if (!horse.currentLocationType) return false
        
        if (locationFilters.includes('racecourse') && horse.currentLocationType === 'racecourse') return true
        if (locationFilters.includes('farm') && horse.currentLocationType === 'farm') return true
        return false
      })
    }
    
    // Apply sorting
    if (sortBy) {
      if (sortBy === 'age-asc') {
        filtered = filtered.sort((a, b) => {
          const ageA = a.yob ? currentYear - a.yob : 999
          const ageB = b.yob ? currentYear - b.yob : 999
          return ageA - ageB
        })
      } else if (sortBy === 'age-desc') {
        filtered = filtered.sort((a, b) => {
          const ageA = a.yob ? currentYear - a.yob : 999
          const ageB = b.yob ? currentYear - b.yob : 999
          return ageB - ageA
        })
      } else if (sortBy === 'name-asc') {
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
      } else if (sortBy === 'name-desc') {
        filtered = filtered.sort((a, b) => b.name.localeCompare(a.name, 'tr'))
      }
    } else {
      // Default sort: by age ascending (youngest first), then alphabetically by name
      filtered = filtered.sort((a, b) => {
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
    
    return filtered
  }
  
  // Get unique ages from horses in current tab
  const getUniqueAges = () => {
    const currentYear = new Date().getFullYear()
    const tabHorses = (() => {
      if (activeTab === 'ACTIVE') {
        return horses.filter((horse) => horse.status !== 'DEAD')
      } else if (activeTab === 'FOALS') {
        return horses.filter((horse) => {
          if (!horse.yob || horse.status === 'DEAD') return false
          const age = currentYear - horse.yob
          return age >= 0 && age <= 3
        })
      } else if (activeTab === 'MARE') {
        return horses.filter((horse) => {
          if (horse.status === 'MARE') return true
          if (horse.yob && horse.gender) {
            const age = currentYear - horse.yob
            const isGirl = horse.gender.includes('Dişi') || horse.gender.includes('DİŞİ') || 
                          horse.gender.includes('Kısrak') || horse.gender.includes('KISRAK')
            if (age > 7 && isGirl) return true
          }
          return false
        })
      }
      return []
    })()
    
    const ages = new Set<number>()
    let hasSevenPlus = false
    tabHorses.forEach((horse) => {
      if (horse.yob) {
        const age = currentYear - horse.yob
        if (age >= 0) {
          if (age < 7) {
            ages.add(age)
          } else {
            hasSevenPlus = true
          }
        }
      }
    })
    const ageArray = Array.from(ages).sort((a, b) => a - b)
    // Add 7+ as a special value (using 7 as the identifier)
    if (hasSevenPlus) {
      ageArray.push(7) // We'll use 7 to represent "7+"
    }
    return ageArray
  }
  
  const toggleAgeFilter = (age: number) => {
    setAgeFilters((prev) => 
      prev.includes(age) 
        ? prev.filter((a) => a !== age)
        : [...prev, age].sort((a, b) => a - b)
    )
  }
  
  const toggleGenderFilter = (gender: string) => {
    setGenderFilters((prev) => 
      prev.includes(gender)
        ? prev.filter((g) => g !== gender)
        : [...prev, gender]
    )
  }
  
  const toggleLocationFilter = (location: string) => {
    setLocationFilters((prev) => 
      prev.includes(location)
        ? prev.filter((l) => l !== location)
        : [...prev, location]
    )
  }
  
  const clearFilters = () => {
    setAgeFilters([])
    setGenderFilters([])
    setLocationFilters([])
  }
  
  const hasActiveFilters = ageFilters.length > 0 || genderFilters.length > 0 || locationFilters.length > 0

  const HorseCard = ({ horse }: { horse: HorseData }) => {
    const age = horse.yob ? new Date().getFullYear() - horse.yob : null

    // Determine if horse is male or female
    const isMale = horse.gender?.includes('Erkek') || horse.gender?.includes('ERKEK') || 
                   horse.gender?.includes('Aygır') || horse.gender?.includes('AYGIR')
    const isFemale = horse.gender?.includes('Dişi') || horse.gender?.includes('DİŞİ') || 
                     horse.gender?.includes('Kısrak') || horse.gender?.includes('KISRAK')

    // Card gradient based on gender - Indigo for males, Purple/Violet for females
    const cardGradient = isMale 
      ? 'bg-gradient-to-br from-indigo-50 via-blue-50 to-white border border-indigo-100'
      : isFemale
      ? 'bg-gradient-to-br from-purple-50 via-violet-50 to-white border border-purple-100'
      : 'bg-gradient-to-br from-slate-50 via-gray-50 to-white border border-gray-100'

    // Button gradient based on gender
    const buttonGradient = isMale
      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'
      : isFemale
      ? 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700'
      : 'bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700'

    // Age badge color
    const ageBadgeColor = isMale
      ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
      : isFemale
      ? 'bg-purple-100 text-purple-700 border-purple-200'
      : 'bg-gray-100 text-gray-700 border-gray-200'

    // Get gender label
    const getGenderLabel = () => {
      if (!horse.gender) return null
      if (isMale) {
        return { text: 'Erkek', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' }
      }
      if (isFemale) {
        return { text: 'Dişi', color: 'bg-purple-100 text-purple-700 border-purple-200' }
      }
      return null
    }

    const genderLabel = getGenderLabel()

    return (
      <Link href={`/app/horses/${horse.id}`}>
        <Card className={`p-4 sm:p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 shadow-lg cursor-pointer ${cardGradient}`}>
          {/* Horse Name */}
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-1">
                  {horse.name}
              </h3>
            </div>
            
            {/* Origin Information - Separate Line */}
            {(horse.sireName || horse.damName) && (
              <div className="mb-3">
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                  {horse.sireName && horse.damName 
                    ? `${horse.sireName} - ${horse.damName}`
                    : horse.sireName || horse.damName}
                </p>
              </div>
            )}
            
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
              {horse.handicapPoints !== null && horse.handicapPoints !== undefined && 
               horse.status !== 'MARE' && 
               !(horse.gender?.includes('Dişi') || horse.gender?.includes('DİŞİ') || 
                 horse.gender?.includes('Kısrak') || horse.gender?.includes('KISRAK')) && (
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
          </div>

          {/* Action Buttons - Minimal Design */}
          <div className="flex gap-2 mt-4">
            <Button 
              size="sm"
              className={`${buttonGradient} text-white font-medium py-1.5 px-3 rounded-md text-xs transition-all duration-300 hover:shadow-md`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setSelectedHorseForNote(horse)
                setNoteModalOpen(true)
              }}
            >
              <FileText className="h-3 w-3 mr-1" />
              Not Ekle
            </Button>
            <Button 
              size="sm" 
              className={`${buttonGradient} text-white font-medium py-1.5 px-3 rounded-md text-xs transition-all duration-300 hover:shadow-md`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setSelectedHorseForExpense(horse.id)
                setExpenseModalOpen(true)
              }}
            >
              <TurkishLira className="h-3 w-3 mr-1" />
              Gider Ekle
            </Button>
                    <Button
                      size="sm"
              className={`${buttonGradient} text-white font-medium py-1.5 px-3 rounded-md text-xs transition-all duration-300 hover:shadow-md`}
                      onClick={(e) => {
                        e.preventDefault()
                e.stopPropagation()
                        setSelectedHorseForLocation(horse)
                        setLocationModalOpen(true)
                      }}
                    >
              <MapPin className="h-3 w-3 mr-1" />
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <TabsList className="inline-flex items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200/50 p-1 shadow-lg gap-1.5 h-9">
            <TabsTrigger 
              value="ACTIVE"
              className="group inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50"
            >
              {TR.horses.active}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === 'ACTIVE' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {filterHorses('ACTIVE').length}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="FOALS"
              className="group inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50"
            >
              {TR.horses.foals}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === 'FOALS' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {filterHorses('FOALS').length}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="MARE"
              className="group inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6366f1] data-[state=active]:to-[#4f46e5] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:hover:bg-gray-50/50"
            >
              {TR.horses.mares}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === 'MARE' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {filterHorses('MARE').length}
              </span>
            </TabsTrigger>
          </TabsList>
          
          {/* Filter Button and Search */}
          <div className="flex items-center gap-2">
            <div className="relative filter-dropdown-container">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`border-2 font-medium px-4 h-9 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
                  hasActiveFilters
                    ? 'border-[#6366f1] bg-indigo-50 text-[#6366f1]'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtrele
                {hasActiveFilters && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#6366f1] text-white text-xs font-semibold">
                    {ageFilters.length + genderFilters.length + locationFilters.length}
                  </span>
                )}
              </Button>
          
          {/* Filter Dropdown */}
          {showFilters && (
            <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 filter-dropdown-container">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Filtreler</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Gender Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Cinsiyet</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'male', label: 'Erkek' },
                      { value: 'female', label: 'Dişi' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => toggleGenderFilter(option.value)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          genderFilters.includes(option.value)
                            ? 'bg-[#6366f1] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Age Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Yaş</label>
                  <div className="flex flex-wrap gap-2">
                    {getUniqueAges().map((age) => (
                      <button
                        key={age}
                        onClick={() => toggleAgeFilter(age)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          ageFilters.includes(age)
                            ? 'bg-[#6366f1] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {age === 7 ? '7+' : age}
                      </button>
                    ))}
                    {getUniqueAges().length === 0 && (
                      <p className="text-sm text-gray-500">Yaş bilgisi bulunamadı</p>
                    )}
                  </div>
                </div>
                
                {/* Location Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Konum</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'racecourse', label: 'Hipodrom' },
                      { value: 'farm', label: 'Çiftlik' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => toggleLocationFilter(option.value)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          locationFilters.includes(option.value)
                            ? 'bg-[#6366f1] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            )}
            </div>
            
            {/* Sort Button */}
            <div className="relative sort-dropdown-container">
              <Button
                variant="outline"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className={`border-2 font-medium px-4 h-9 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
                  sortBy
                    ? 'border-[#6366f1] bg-indigo-50 text-[#6366f1]'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sırala
              </Button>
          
              {/* Sort Dropdown */}
              {showSortDropdown && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 sort-dropdown-container">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Sırala</h3>
                    <button
                      onClick={() => setShowSortDropdown(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Sort Options */}
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setSortBy('age-asc')
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        sortBy === 'age-asc'
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>Yaş</span>
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSortBy('age-desc')
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        sortBy === 'age-desc'
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>Yaş</span>
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSortBy('name-asc')
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        sortBy === 'name-asc'
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>İsim</span>
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSortBy('name-desc')
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        sortBy === 'name-desc'
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>İsim</span>
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    {sortBy && (
                      <button
                        onClick={() => {
                          setSortBy(null)
                        }}
                        className="w-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors mt-2"
                      >
                        Sıralamayı Kaldır
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Search Button */}
            {!isSearchOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSearchOpen(true)}
                className="h-9 w-9 p-0 border-gray-300 hover:bg-gray-50"
              >
                <Search className="h-4 w-4 text-gray-600" />
              </Button>
            ) : (
              <div className="relative w-44">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="At, origin ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex h-9 w-full pl-8 pr-8 text-sm border-2 border-[#6366f1] bg-indigo-50 text-gray-900 rounded-lg shadow-md focus:border-[#6366f1] focus:outline-none transition-all duration-300 placeholder:text-gray-500 placeholder:text-sm"
                  autoFocus
                  style={{ boxShadow: 'none' }}
                  onFocus={(e) => {
                    e.target.style.boxShadow = 'none'
                    e.target.style.outline = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false)
                    setSearchQuery('')
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          </div>
          
        <Link href="/app/horses/new">
            <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
            <Plus className="h-4 w-4 mr-2" />
            {TR.horses.addHorse}
          </Button>
        </Link>
      </div>

        <TabsContent value="ACTIVE" className="space-y-4 mt-6">
          {filterHorses('ACTIVE').length === 0 ? (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <LayoutGrid className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-700 font-semibold">Aktif atınız bulunmuyor</p>
                <p className="text-sm text-gray-500 mt-2">Yeni at eklemek için yukarıdaki butonu kullanın</p>
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
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <LayoutGrid className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-700 font-semibold">Tay atınız bulunmuyor</p>
                <p className="text-sm text-gray-500 mt-2">Yeni at eklemek için yukarıdaki butonu kullanın</p>
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
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <LayoutGrid className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-700 font-semibold">Kısrak atınız bulunmuyor</p>
                <p className="text-sm text-gray-500 mt-2">Yeni at eklemek için yukarıdaki butonu kullanın</p>
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

      {selectedHorseForNote && (
        <AddNoteModal
          open={noteModalOpen}
          onClose={() => {
            setNoteModalOpen(false)
            setSelectedHorseForNote(null)
          }}
          horseId={selectedHorseForNote.id}
          horseName={selectedHorseForNote.name}
          onSuccess={() => {
            fetchHorses()
          }}
        />
      )}
    </div>
  )
}

