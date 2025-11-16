'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { MapPin, Check, UserPlus } from 'lucide-react'
import { Checkbox } from '@/app/components/ui/checkbox'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'

// Racecourse cities (specific cities for racecourses)
const RACECOURSE_CITIES = [
  'İstanbul Veliefendi',
  'Adana Yeşiloba',
  'Ankara 75. Yıl',
  'Bursa Osmangazi',
  'Diyarbakır',
  'Elazığ',
  'İzmir Şirinyer',
  'Kocaeli Kartepe',
  'Şanlıurfa',
  'Antalya',
]

// Common Turkish cities (for farms)
const TURKISH_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya',
  'Artvin', 'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu',
  'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır',
  'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun',
  'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta', 'İçel', 'İstanbul', 'İzmir',
  'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya',
  'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop',
  'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
  'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale',
  'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis',
  'Osmaniye', 'Düzce',
]

interface Horse {
  id: string
  name: string
  yob?: number | null
  sireName?: string | null
  damName?: string | null
  createdAt: string
}

interface HorseLocation {
  locationType: 'racecourse' | 'farm'
  city: string
}

export default function SetLocationsPage() {
  const router = useRouter()
  const [horses, setHorses] = useState<Horse[]>([])
  const [ownerRef, setOwnerRef] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [horseLocations, setHorseLocations] = useState<Record<string, HorseLocation>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [horseCardWidth, setHorseCardWidth] = useState<number | null>(null)
  const horseCardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    fetchHorses()
  }, [])

  // Calculate max width of all horse cards
  useEffect(() => {
    if (horses.length === 0) return

    // Use setTimeout to ensure DOM is updated
    const timer = setTimeout(() => {
      const widths: number[] = []
      Object.values(horseCardRefs.current).forEach((ref) => {
        if (ref) {
          // Temporarily remove width constraints to measure natural width
          const originalWidth = ref.style.width
          const originalMinWidth = ref.style.minWidth
          ref.style.width = 'auto'
          ref.style.minWidth = 'auto'
          widths.push(ref.scrollWidth)
          ref.style.width = originalWidth
          ref.style.minWidth = originalMinWidth
        }
      })

      if (widths.length > 0) {
        const maxWidth = Math.max(...widths)
        setHorseCardWidth(maxWidth)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [horses, horseLocations])

  const fetchHorses = async () => {
    try {
      const response = await fetch('/api/onboarding/horses-without-location', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Atlar yüklenemedi')
      }

      const data = await response.json()
      const fetchedHorses = data.horses || []
      setHorses(fetchedHorses)
      setOwnerRef(data.ownerRef || null)
      
      // Initialize location data for all horses
      const initialLocations: Record<string, HorseLocation> = {}
      fetchedHorses.forEach((horse: Horse) => {
        initialLocations[horse.id] = {
          locationType: 'racecourse',
          city: '',
        }
      })
      setHorseLocations(initialLocations)
    } catch (error) {
      console.error('Error fetching horses:', error)
      toast.error('Atlar yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }


  const updateHorseLocation = (horseId: string, field: keyof HorseLocation, value: string) => {
    setHorseLocations((prev) => ({
      ...prev,
      [horseId]: {
        ...prev[horseId],
        [field]: value,
      },
    }))
  }

  const updateLocationType = (horseId: string, locationType: 'racecourse' | 'farm') => {
    setHorseLocations((prev) => ({
      ...prev,
      [horseId]: {
        ...prev[horseId],
        locationType,
        city: '', // Clear city when location type changes
      },
    }))
  }

  const handleSkip = async () => {
    // Save all horses with locations before navigating
    const horsesWithLocations = horses.filter((horse) => {
      const location = horseLocations[horse.id]
      return location && location.city
    })

    if (horsesWithLocations.length === 0) {
      // No locations to save, just navigate
      router.replace('/app/horses')
      return
    }

    setIsSubmitting(true)

    try {
      // Save all locations in parallel
      const promises = horsesWithLocations.map(async (horse) => {
        const location = horseLocations[horse.id]
        if (!location || !location.city) return

        const response = await fetch(`/api/horses/${horse.id}/location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            locationType: location.locationType,
            city: location.city,
            startDate: new Date().toISOString().split('T')[0],
            notes: '',
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || `Konum güncellenemedi: ${horse.name}`)
        }
      })

      await Promise.all(promises)
      
      // Navigate to next page
      router.replace('/app/horses')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
      setIsSubmitting(false)
    }
  }

  const availableCities = (locationType: 'racecourse' | 'farm') => 
    locationType === 'racecourse' ? RACECOURSE_CITIES : TURKISH_CITIES

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366f1] mx-auto mb-4"></div>
          <p className="text-gray-600">{TR.common.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex items-start justify-center p-4 pt-8">
      <Card className="w-full max-w-fit bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50 flex flex-col max-h-[90vh]">
        <CardHeader className="space-y-4 flex-shrink-0">
          <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-2xl flex items-center justify-center shadow-lg mx-auto">
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              Atlarınızın Konumunu Belirleyin
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {horses.length > 0 
                ? `${horses.length} at için konum bilgisi girin` 
                : 'Tüm atlar için konum bilgisi girildi'}
            </CardDescription>
            {horses.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Konum seçtikten sonra "Devam Et" butonuna tıklayın
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col p-6 flex-1 min-h-0 overflow-hidden">
          {horses.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1">
              <Check className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-gray-700 font-medium mb-2">Tüm atlar için konum bilgisi girildi</p>
              <Button
                onClick={handleSkip}
                className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300 mt-4"
              >
                Devam Et
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                {horses.map((horse) => {
                  const location = horseLocations[horse.id] || {
                    locationType: 'racecourse' as const,
                    city: '',
                  }
                  const hasLocation = !!(location && location.city)

                  return (
                    <div key={horse.id} className="flex items-start gap-3 w-full">
                      {/* Horse Card - same as import-horses page */}
                      <div
                        ref={(el) => {
                          horseCardRefs.current[horse.id] = el
                        }}
                        className={`flex items-center space-x-3 py-2 px-3 border-2 rounded-lg transition-all duration-200 h-[60px] flex-shrink-0 ${
                          hasLocation
                            ? 'border-green-200 bg-green-50/50'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                        }`}
                        style={horseCardWidth ? { width: `${horseCardWidth}px` } : undefined}
                      >
                        {ownerRef && (
                          <div className="flex-shrink-0 w-12 h-12 rounded border-2 border-gray-200 overflow-hidden bg-white flex items-center justify-center relative">
                            <img
                              src={`https://medya-cdn.tjk.org/formaftp/${ownerRef}.jpg`}
                              alt="Eküri Forması"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                const container = e.currentTarget.parentElement
                                if (container) {
                                  const icon = container.querySelector('.fallback-icon') as HTMLElement
                                  if (icon) icon.style.display = 'block'
                                }
                              }}
                            />
                            <UserPlus className="w-8 h-8 text-[#6366f1] fallback-icon hidden" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-900">{horse.name}</p>
                          {horse.yob && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              {horse.yob}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Location Controls Container - styled similar to horse card */}
                      <div className={`flex flex-col gap-3 py-3.5 px-4 border-2 rounded-lg transition-all duration-200 h-[60px] justify-center flex-shrink-0 w-fit ${hasLocation ? 'border-green-200 bg-green-50/50' : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'}`}>
                        {/* First row: Location Type Radio Buttons */}
                        <div className="flex gap-4">
                          <label className="flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`location-type-${horse.id}`}
                              value="racecourse"
                              checked={location.locationType === 'racecourse'}
                              onChange={(e) => {
                                if (e.target.checked && !isSubmitting) {
                                  updateLocationType(horse.id, 'racecourse')
                                }
                              }}
                              className="w-4 h-4 text-[#6366f1] focus:ring-[#6366f1] cursor-pointer"
                              disabled={isSubmitting}
                            />
                            <span className="text-gray-700 text-sm font-medium">Hipodrom</span>
                          </label>
                          <label className="flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`location-type-${horse.id}`}
                              value="farm"
                              checked={location.locationType === 'farm'}
                              onChange={(e) => {
                                if (e.target.checked && !isSubmitting) {
                                  updateLocationType(horse.id, 'farm')
                                }
                              }}
                              className="w-4 h-4 text-[#6366f1] focus:ring-[#6366f1] cursor-pointer"
                              disabled={isSubmitting}
                            />
                            <span className="text-gray-700 text-sm font-medium">Çiftlik</span>
                          </label>
                        </div>

                        {/* Second row: City Dropdown - beautified and smaller */}
                        <div className="relative">
                          <select
                            value={location.city}
                            onChange={(e) => {
                              updateHorseLocation(horse.id, 'city', e.target.value)
                            }}
                            disabled={isSubmitting}
                            className="w-32 h-6 rounded-md border-2 border-gray-300 bg-white px-2 py-0.5 pr-6 text-xs text-gray-700 font-medium shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:border-[#6366f1] hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-300 appearance-none cursor-pointer"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236366f1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 0.3rem center',
                              backgroundSize: '0.875em 0.875em',
                            }}
                          >
                            <option value="" className="text-gray-500">Şehir Seçin</option>
                            {availableCities(location.locationType).map((cityName) => (
                              <option key={cityName} value={cityName} className="text-gray-900">
                                {cityName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Continue Button */}
              <div className="pt-4 mt-auto flex-shrink-0">
                <div className="flex justify-center">
                  <Button
                    type="button"
                    onClick={handleSkip}
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Kaydediliyor...' : 'Devam Et'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
