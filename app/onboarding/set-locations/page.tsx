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
      const currentYear = new Date().getFullYear()
      const initialLocations: Record<string, HorseLocation> = {}
      fetchedHorses.forEach((horse: Horse) => {
        // Check if horse name ends with "Tayı"
        const nameEndsWithTayi = horse.name.trim().endsWith('Tayı')
        
        // Check if horse is older than 8 years (9+ years old)
        // Convert yob to number if it's a string
        const yobNumber = horse.yob ? (typeof horse.yob === 'string' ? parseInt(horse.yob, 10) : horse.yob) : null
        const age = yobNumber ? currentYear - yobNumber : null
        const isOlderThan8 = age !== null && age > 8
        
        // Set default to 'farm' if name ends with "Tayı" or horse is older than 8 years
        const defaultLocationType = (nameEndsWithTayi || isOlderThan8) ? 'farm' : 'racecourse'
        
        initialLocations[horse.id] = {
          locationType: defaultLocationType,
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


  const updateLocationType = (horseId: string, locationType: 'racecourse' | 'farm') => {
    setHorseLocations((prev) => ({
      ...prev,
      [horseId]: {
        ...prev[horseId],
        locationType,
      },
    }))
  }

  const handleSkip = async () => {
    // Save all horses with locations before navigating
    const horsesWithLocations = horses.filter((horse) => {
      const location = horseLocations[horse.id]
      return location && location.locationType
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
        if (!location || !location.locationType) return

        const response = await fetch(`/api/horses/${horse.id}/location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            locationType: location.locationType,
            city: '',
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
                  }

                  return (
                    <div key={horse.id} className="flex items-start gap-3 w-full">
                      {/* Horse Card - same as import-horses page */}
                      <div
                        ref={(el) => {
                          horseCardRefs.current[horse.id] = el
                        }}
                        className="flex items-center space-x-3 py-2 px-3 border-2 rounded-lg transition-all duration-200 h-[60px] flex-shrink-0 border-gray-200 hover:border-gray-300 bg-white hover:shadow-md"
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
                      <div className="flex items-center gap-4 py-3.5 px-4 border-2 rounded-lg transition-all duration-200 h-[60px] justify-center flex-shrink-0 w-fit border-gray-200 hover:border-gray-300 bg-white hover:shadow-md">
                        {/* Location Type Radio Buttons */}
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
