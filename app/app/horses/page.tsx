'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Plus, LayoutGrid, FileText, Filter, X, TurkishLira, MapPin, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TR } from '@/lib/constants/tr'
import { toast } from 'sonner'
import { formatDate, formatCurrency, getRelativeTime } from '@/lib/utils/format'
import { AddExpenseModal } from '@/app/components/modals/add-expense-modal'
import { ChangeLocationModal } from '@/app/components/modals/change-location-modal'
import { AddNoteModal } from '@/app/components/modals/add-note-modal'
import { AddHorseModal } from '@/app/components/modals/add-horse-modal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog'

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
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [selectedHorseForExpense, setSelectedHorseForExpense] = useState<string | null>(null)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [selectedHorseForLocation, setSelectedHorseForLocation] = useState<HorseData | null>(null)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [selectedHorseForNote, setSelectedHorseForNote] = useState<HorseData | null>(null)
  const [addHorseModalOpen, setAddHorseModalOpen] = useState(false)
  const [removeHorseDialogOpen, setRemoveHorseDialogOpen] = useState(false)
  const [selectedHorseToRemove, setSelectedHorseToRemove] = useState<string | null>(null)
  const [isRemovingHorse, setIsRemovingHorse] = useState(false)
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

  const handleRemoveHorse = async () => {
    if (!selectedHorseToRemove) return
    setIsRemovingHorse(true)
    try {
      const response = await fetch(`/api/horses/${selectedHorseToRemove}`, {
        method: 'DELETE',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'At kaldırılamadı')
      }
      toast.success('At başarıyla kaldırıldı')
      setRemoveHorseDialogOpen(false)
      setSelectedHorseToRemove(null)
      fetchHorses()
    } catch (error) {
      console.error('Remove horse error:', error)
      toast.error(error instanceof Error ? error.message : 'At kaldırılırken bir hata oluştu')
    } finally {
      setIsRemovingHorse(false)
    }
  }

  const filterHorses = () => {
    const currentYear = new Date().getFullYear()
    let filtered: HorseData[] = []
    
    // Start with all horses (excluding only DEAD horses)
    filtered = allHorses.filter((horse) => horse.status !== 'DEAD')
    
    // Apply category filters (multiple selection)
    if (categoryFilters.length > 0) {
      filtered = filtered.filter((horse) => {
        const matchesFoals = categoryFilters.includes('FOALS')
        const matchesMare = categoryFilters.includes('MARE')
        
        if (matchesFoals || matchesMare) {
          let matches = false
          
          // Check if matches FOALS
          if (matchesFoals) {
            if (horse.yob) {
              const age = currentYear - horse.yob
              if (age >= 0 && age <= 3) {
                matches = true
              }
            }
          }
          
          // Check if matches MARE
          if (matchesMare) {
            if (horse.status === 'MARE') {
              matches = true
            } else if (horse.yob && horse.gender) {
          const age = currentYear - horse.yob
          const isGirl = horse.gender.includes('Dişi') || horse.gender.includes('DİŞİ') || 
                        horse.gender.includes('Kısrak') || horse.gender.includes('KISRAK')
              if (age > 7 && isGirl) {
                matches = true
              }
            }
          }
          
          return matches
        }
        
        return false
      })
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
        const isGelding = horse.gender.includes('İğdiş') || horse.gender.includes('İĞDİŞ') ||
                          horse.gender.includes('Iğdiş') || horse.gender.includes('IĞDİŞ')
        const isMale = horse.gender.includes('Erkek') || horse.gender.includes('ERKEK') || 
                      horse.gender.includes('Aygır') || horse.gender.includes('AYGIR')
        const isFemale = horse.gender.includes('Dişi') || horse.gender.includes('DİŞİ') || 
                         horse.gender.includes('Kısrak') || horse.gender.includes('KISRAK')
        
        if (genderFilters.includes('gelding') && isGelding) return true
        if (genderFilters.includes('male') && isMale && !isGelding) return true
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

  // Filter horses when activeTab or other filters change
  useEffect(() => {
    const filtered = filterHorses()
    // Apply search query if exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const searchFiltered = filtered.filter((horse) => {
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
      setHorses(searchFiltered)
    } else {
      setHorses(filtered)
    }
  }, [categoryFilters, ageFilters, genderFilters, locationFilters, sortBy, allHorses, searchQuery])
  
  // Get unique genders from user's horses
  const getUniqueGenders = () => {
    const genders: { value: string; label: string }[] = []
    
    allHorses.forEach((horse) => {
      if (!horse.gender) return
      
      const isGelding = horse.gender.includes('İğdiş') || horse.gender.includes('İĞDİŞ') ||
                        horse.gender.includes('Iğdiş') || horse.gender.includes('IĞDİŞ')
      const isMale = horse.gender.includes('Erkek') || horse.gender.includes('ERKEK') || 
                    horse.gender.includes('Aygır') || horse.gender.includes('AYGIR')
      const isFemale = horse.gender.includes('Dişi') || horse.gender.includes('DİŞİ') || 
                       horse.gender.includes('Kısrak') || horse.gender.includes('KISRAK')
      
      if (isGelding && !genders.find(g => g.value === 'gelding')) {
        genders.push({ value: 'gelding', label: 'İğdiş' })
      }
      if (isMale && !isGelding && !genders.find(g => g.value === 'male')) {
        genders.push({ value: 'male', label: 'Erkek' })
      }
      if (isFemale && !genders.find(g => g.value === 'female')) {
        genders.push({ value: 'female', label: 'Dişi' })
      }
    })
    
    // Return in a specific order: Erkek, Dişi, İğdiş
    const ordered: { value: string; label: string }[] = []
    const male = genders.find(g => g.value === 'male')
    const female = genders.find(g => g.value === 'female')
    const gelding = genders.find(g => g.value === 'gelding')
    
    if (male) ordered.push(male)
    if (female) ordered.push(female)
    if (gelding) ordered.push(gelding)
    
    return ordered
  }

  // Get unique locations from user's horses
  const getUniqueLocations = () => {
    const locations: { value: string; label: string }[] = []
    
    allHorses.forEach((horse) => {
      if (!horse.currentLocationType) return
      
      if (horse.currentLocationType === 'racecourse' && !locations.find(l => l.value === 'racecourse')) {
        locations.push({ value: 'racecourse', label: 'Hipodrom' })
      }
      if (horse.currentLocationType === 'farm' && !locations.find(l => l.value === 'farm')) {
        locations.push({ value: 'farm', label: 'Çiftlik' })
      }
    })
    
    // Return in a specific order: Hipodrom, Çiftlik
    const ordered: { value: string; label: string }[] = []
    const racecourse = locations.find(l => l.value === 'racecourse')
    const farm = locations.find(l => l.value === 'farm')
    
    if (racecourse) ordered.push(racecourse)
    if (farm) ordered.push(farm)
    
    return ordered
  }

  // Get unique ages from filtered horses
  const getUniqueAges = () => {
    const currentYear = new Date().getFullYear()
    // Use the filtered horses based on current filters
    const tabHorses = filterHorses()
    
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
  
  const toggleCategoryFilter = (category: string) => {
    setCategoryFilters((prev) => 
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }
  
  const clearFilters = () => {
    setCategoryFilters([])
    setAgeFilters([])
    setGenderFilters([])
    setLocationFilters([])
  }
  
  const hasActiveFilters = categoryFilters.length > 0 || ageFilters.length > 0 || genderFilters.length > 0 || locationFilters.length > 0

  const HorseCard = ({ horse }: { horse: HorseData }) => {
    const age = horse.yob ? new Date().getFullYear() - horse.yob : null

    // Determine if horse is male, female, or gelding
    const isGelding = horse.gender?.includes('İğdiş') || horse.gender?.includes('İĞDİŞ') ||
                      horse.gender?.includes('Iğdiş') || horse.gender?.includes('IĞDİŞ')
    const isMale = horse.gender?.includes('Erkek') || horse.gender?.includes('ERKEK') || 
                   horse.gender?.includes('Aygır') || horse.gender?.includes('AYGIR')
    // Note: Geldings are NOT included in isMale - they have their own styling
    const isFemale = horse.gender?.includes('Dişi') || horse.gender?.includes('DİŞİ') || 
                     horse.gender?.includes('Kısrak') || horse.gender?.includes('KISRAK')

    // Card gradient based on gender - Indigo for males, Purple/Violet for females, Teal/Cyan for geldings
    const cardGradient = isGelding
      ? 'bg-gradient-to-br from-teal-50 via-cyan-50 to-white border border-teal-100'
      : isMale 
      ? 'bg-gradient-to-br from-indigo-50 via-blue-50 to-white border border-indigo-100'
      : isFemale
      ? 'bg-gradient-to-br from-purple-50 via-violet-50 to-white border border-purple-100'
      : 'bg-gradient-to-br from-slate-50 via-gray-50 to-white border border-gray-100'

    // Button gradient based on gender
    const buttonGradient = isGelding
      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700'
      : isMale
      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'
      : isFemale
      ? 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700'
      : 'bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700'

    // Age badge color
    const ageBadgeColor = isGelding
      ? 'bg-teal-100 text-teal-700 border-teal-200'
      : isMale
      ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
      : isFemale
      ? 'bg-purple-100 text-purple-700 border-purple-200'
      : 'bg-gray-100 text-gray-700 border-gray-200'

    // Get gender label
    const getGenderLabel = () => {
      if (!horse.gender) return null
      if (isGelding) {
        return { text: 'İğdiş', color: 'bg-teal-100 text-teal-700 border-teal-200' }
      }
      if (isMale && !isGelding) {
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
                  HP: {horse.handicapPoints}
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
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Filter Button and Search */}
          <div className="flex items-center gap-2">
            <div className="relative filter-dropdown-container">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
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
                    {categoryFilters.length + ageFilters.length + genderFilters.length + locationFilters.length}
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

                {/* Category Filter (Tabs) */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Kategori</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'FOALS', label: TR.horses.foals },
                      { value: 'MARE', label: TR.horses.mares },
                    ].map((tab) => {
                      const isSelected = categoryFilters.includes(tab.value)
                      return (
                        <button
                          key={tab.value}
                          onClick={() => toggleCategoryFilter(tab.value)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                
                {/* Gender Filter */}
                {getUniqueGenders().length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Cinsiyet</label>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueGenders().map((option) => (
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
                )}
                
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
                {getUniqueLocations().length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Konum</label>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueLocations().map((option) => (
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
                )}
                
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
                className={`border-2 font-medium px-4 h-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
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
                <div className="absolute left-0 top-full mt-2 w-auto min-w-[140px] bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 sort-dropdown-container">
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
                        setSortBy(sortBy === 'age-asc' ? null : 'age-asc')
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        sortBy === 'age-asc'
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>Yaş</span>
                      <ArrowUp className="h-4 w-4 flex-shrink-0" />
                    </button>
                    <button
                      onClick={() => {
                        setSortBy(sortBy === 'age-desc' ? null : 'age-desc')
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        sortBy === 'age-desc'
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>Yaş</span>
                      <ArrowDown className="h-4 w-4 flex-shrink-0" />
                    </button>
                    <button
                      onClick={() => {
                        setSortBy(sortBy === 'name-asc' ? null : 'name-asc')
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        sortBy === 'name-asc'
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>İsim</span>
                      <ArrowUp className="h-4 w-4 flex-shrink-0" />
                    </button>
                    <button
                      onClick={() => {
                        setSortBy(sortBy === 'name-desc' ? null : 'name-desc')
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        sortBy === 'name-desc'
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>İsim</span>
                      <ArrowDown className="h-4 w-4 flex-shrink-0" />
                    </button>
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
                className="h-10 w-10 p-0 border-gray-300 hover:bg-gray-50"
              >
                <Search className="h-4 w-4 text-gray-600" />
              </Button>
            ) : (
              <div className="relative w-36">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="At, origin ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex h-10 w-full pl-8 pr-8 text-sm border-2 border-[#6366f1] bg-indigo-50 text-gray-900 rounded-lg shadow-md focus:border-[#6366f1] focus:outline-none transition-all duration-300 placeholder:text-gray-500 placeholder:text-sm"
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
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setAddHorseModalOpen(true)}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Plus className="h-4 w-4 mr-2" />
            {TR.horses.addHorse}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={horses.length === 0}
            onClick={() => {
              if (horses.length === 0) {
                toast.error('Kaldırılacak at bulunamadı')
                return
              }
              setSelectedHorseToRemove(horses[0]?.id || null)
              setRemoveHorseDialogOpen(true)
            }}
            className="border-2 border-rose-200 text-rose-600 hover:bg-rose-50 font-medium px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {TR.horses.removeHorse}
          </Button>
        </div>
      </div>

      {/* Horses Display */}
      <div className="space-y-4 mt-6">
        {horses.length === 0 ? (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <LayoutGrid className="h-8 w-8 text-white" />
                </div>
              <p className="text-gray-700 font-semibold">Atınız bulunmuyor</p>
                <p className="text-sm text-gray-500 mt-2">Yeni at eklemek için yukarıdaki butonu kullanın</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {horses.map((horse) => (
                <HorseCard key={horse.id} horse={horse} />
              ))}
            </div>
          )}
            </div>

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

      <AddHorseModal
        open={addHorseModalOpen}
        onClose={() => setAddHorseModalOpen(false)}
        onSuccess={() => {
          fetchHorses()
        }}
      />

      <Dialog
        open={removeHorseDialogOpen}
        onOpenChange={(open) => {
          setRemoveHorseDialogOpen(open)
          if (!open) {
            setSelectedHorseToRemove(null)
          } else if (!selectedHorseToRemove && horses.length > 0) {
            setSelectedHorseToRemove(horses[0].id)
          }
        }}
      >
        <DialogContent className="max-w-sm bg-white/95 backdrop-blur border border-rose-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">{TR.horses.removeHorse}</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Seçilen at listeden kaldırılacak ve durumu &ldquo;Emekli&rdquo; olarak işaretlenecek. Devam etmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">At Seçin</label>
              <select
                value={selectedHorseToRemove || ''}
                onChange={(e) => setSelectedHorseToRemove(e.target.value || null)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 bg-white"
              >
                {horses.length === 0 && <option value="">Kaldırılacak at yok</option>}
                {horses.length > 0 && (
                  <>
                    <option value="" disabled>
                      Bir at seçin
                    </option>
                    {horses.map((horseOption) => (
                      <option key={horseOption.id} value={horseOption.id}>
                        {horseOption.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRemoveHorseDialogOpen(false)
                  setSelectedHorseToRemove(null)
                }}
                className="border-gray-200 text-gray-600"
              >
                İptal
              </Button>
              <Button
                type="button"
                onClick={handleRemoveHorse}
                disabled={!selectedHorseToRemove || isRemovingHorse}
                className="bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white min-w-[130px]"
              >
                {isRemovingHorse ? 'Kaldırılıyor...' : 'Atı Kaldır'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

