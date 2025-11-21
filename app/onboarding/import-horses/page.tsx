'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Checkbox } from '@/app/components/ui/checkbox'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Download, Search, X, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'

interface Horse {
  name: string
  yob?: number
  gender?: string
  status?: string
  externalRef?: string
  sire?: string
  dam?: string
  selected: boolean
  isImported?: boolean
}

export default function ImportHorsesPage() {
  const router = useRouter()
  const [horses, setHorses] = useState<Horse[]>([])
  const [allHorses, setAllHorses] = useState<Horse[]>([]) // Store all horses for filtering
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [isFetchingDetails, setIsFetchingDetails] = useState(false)
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0, currentHorse: '', stage: 1 })
  const [progressMessage, setProgressMessage] = useState('Atlarınız ekürinize ekleniyor.')
  const [ownerRef, setOwnerRef] = useState<string | null>(null)

  useEffect(() => {
    console.log('=== IMPORT HORSES PAGE MOUNTED ===')
    fetchHorses()
  }, [])

  const fetchHorses = async () => {
    console.log('=== HORSE IMPORT: Starting fetchHorses ===')
    
    try {
      // Get the current user's owner profile to get their official name and TJK ID
      console.log('Step 1: Fetching user data from /api/auth/me')
      const userResponse = await fetch('/api/auth/me', {
        credentials: 'include',
      })
      
      console.log('Step 2: User response status:', userResponse.status, userResponse.statusText)
      const userData = await userResponse.json()
      console.log('Step 3: User data received:', JSON.stringify(userData, null, 2))

      if (!userResponse.ok || !userData.user?.ownerProfile?.officialName) {
        console.error('Step 4: FAILED - User data invalid')
        throw new Error('Sahip bilgisi bulunamadı')
      }

      const ownerName = userData.user.ownerProfile.officialName
      const ownerRefValue = userData.user.ownerProfile.officialRef
      setOwnerRef(ownerRefValue)

      console.log('Step 5: Owner info extracted:', { ownerName, ownerRef: ownerRefValue })

      if (!ownerRefValue) {
        console.error('Step 6: FAILED - No TJK ID found')
        toast.error('TJK ID bulunamadı. Lütfen sahip bilgilerinizi kontrol edin.')
        setHorses([])
        return
      }

      // Use our API route as proxy to avoid CORS issues
      const params = new URLSearchParams({
        ownerName,
        ownerRef: ownerRefValue,
      })
      const tjkUrl = `/api/tjk/horses?${params.toString()}`
      
      console.log('Step 7: Calling TJK horses API:', tjkUrl)
      const response = await fetch(tjkUrl)
      
      console.log('Step 8: TJK API response status:', response.status, response.statusText)
      const data = await response.json()
      console.log('Step 9: TJK API response data:', JSON.stringify(data, null, 2))

      if (!response.ok) {
        console.error('Step 10: FAILED - Response not OK')
        throw new Error(data.error || 'Atlar yüklenemedi')
      }

      // Fetch existing horses to check which ones are already imported
      const existingHorsesResponse = await fetch('/api/horses', {
        credentials: 'include',
      })
      const existingHorsesData = await existingHorsesResponse.json()
      const existingHorses = existingHorsesData.horses || []
      const existingExternalRefs = new Set(
        existingHorses
          .map((h: any) => h.externalRef)
          .filter((ref: any) => ref)
      )

      // Map to our format (dead horses are already filtered out in the API)
      const horses = (data.horses || []).map((horse: any) => ({
        ...horse,
        selected: false,
        isImported: horse.externalRef ? existingExternalRefs.has(horse.externalRef) : false,
      }))

      // Sort: imported horses first (prioritized), then alphabetically within each group
      const sortedHorses = [...horses].sort((a, b) => {
        // Priority 1: Imported horses always come first
        if (a.isImported && !b.isImported) {
          return -1 // a comes before b
        }
        if (!a.isImported && b.isImported) {
          return 1 // b comes before a
        }
        // Priority 2: Within the same group (both imported or both not imported), sort alphabetically
        return a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' })
      })

      console.log('Step 11: Mapped horses:', sortedHorses.length, 'horses (dead horses filtered out)')
      console.log('Horses data:', JSON.stringify(sortedHorses, null, 2))
      
      setAllHorses(sortedHorses)
      setHorses(sortedHorses)

      if (horses.length === 0) {
        console.log('Step 12: No horses found')
        toast.info('TJK\'da kayıtlı atınız bulunamadı')
      }
    } catch (error) {
      console.error('=== HORSE IMPORT: ERROR CAUGHT ===')
      console.error('Error type:', typeof error)
      console.error('Error object:', error)
      console.error('Error message:', error instanceof Error ? error.message : String(error))
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      toast.error('Atlar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.')
    } finally {
      console.log('=== HORSE IMPORT: Finished (loading = false) ===')
      setIsLoading(false)
    }
  }

  // Filter horses based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setHorses(allHorses)
    } else {
      const query = searchQuery.toLowerCase().trim()
      const filtered = allHorses.filter((horse) =>
        horse.name.toLowerCase().includes(query)
      )
      // Maintain sort order: imported first (prioritized), then alphabetically within each group
      const sorted = [...filtered].sort((a, b) => {
        // Priority 1: Imported horses always come first
        if (a.isImported && !b.isImported) {
          return -1 // a comes before b
        }
        if (!a.isImported && b.isImported) {
          return 1 // b comes before a
        }
        // Priority 2: Within the same group (both imported or both not imported), sort alphabetically
        return a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' })
      })
      setHorses(sorted)
    }
  }, [searchQuery, allHorses])

  const toggleHorse = (index: number) => {
    const horse = horses[index]
    // Find the horse in allHorses and update it
    const allHorsesIndex = allHorses.findIndex((h) => h.externalRef === horse.externalRef && h.name === horse.name)
    if (allHorsesIndex !== -1) {
      const updatedAllHorses = [...allHorses]
      updatedAllHorses[allHorsesIndex] = { ...updatedAllHorses[allHorsesIndex], selected: !updatedAllHorses[allHorsesIndex].selected }
      setAllHorses(updatedAllHorses)
      
      // Update filtered horses
      const updatedHorses = [...horses]
      updatedHorses[index] = { ...updatedHorses[index], selected: !updatedHorses[index].selected }
      setHorses(updatedHorses)
    }
  }

  const selectAll = () => {
    const allSelected = horses.every((h) => h.selected)
    const updatedSelection = !allSelected
    
    // Update all horses (both filtered and all)
    const updatedAllHorses = allHorses.map((h) => {
      // Only update if this horse is in the current filtered list
      const isInFiltered = horses.some((fh) => fh.externalRef === h.externalRef && fh.name === h.name)
      return isInFiltered ? { ...h, selected: updatedSelection } : h
    })
    setAllHorses(updatedAllHorses)
    
    const updatedHorses = horses.map((h) => ({ ...h, selected: updatedSelection }))
    setHorses(updatedHorses)
  }

  const handleImport = async () => {
    const selectedHorses = allHorses.filter((h) => h.selected)

    if (selectedHorses.length === 0) {
      toast.error('Lütfen en az bir at seçin')
      return
    }

    // Set loading state immediately to prevent flash
    setIsImporting(true)

    try {
      // Step 1: Create horses
      const response = await fetch('/api/import/horses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          horses: selectedHorses.map((h) => ({
            name: h.name,
            yob: h.yob,
            status: h.status || 'RACING',
            gender: h.gender,
            externalRef: h.externalRef,
            sire: h.sire,
            dam: h.dam,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Atlar eklenemedi')
      }

      toast.success(`${selectedHorses.length} at başarıyla seçildi`)

      // Step 2: Start background fetch for detailed data (non-blocking)
      const horsesWithRef = data.horses.filter((h: any) => h.externalRef)
      
      if (horsesWithRef.length > 0) {
        // Start background fetch without waiting
        fetch('/api/import/horses/fetch-details-background', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            horseIds: horsesWithRef.map((h: any) => h.id),
          }),
        }).catch((error) => {
          console.error('Failed to start background fetch:', error)
          // Don't show error to user, it will happen in background
        })
      }

      // Step 3: Redirect to location setup page
      router.replace(`/onboarding/set-locations?count=${selectedHorses.length}`)
      // Don't reset state - navigation will unmount component
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
      setIsImporting(false) // Only reset on error
    }
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
          </div>
          <p className="text-gray-900 font-bold text-lg mb-2">{TR.common.loading}</p>
          <p className="text-sm text-gray-600 font-medium mb-1">
            TJK sisteminden atlarınız getiriliyor...
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Bu işlem 5-10 saniye sürebilir
          </p>
        </div>
      </div>
    )
  }

  if (isImporting || isFetchingDetails) {
    // Calculate progress: 50% for stage 1 (importing), 50-100% for stage 2 (fetching details)
    let progress = 0
    if (isImporting) {
      progress = 50 // Show 50% during import
    } else if (isFetchingDetails) {
      const detailProgress = fetchProgress.total > 0 
        ? Math.round((fetchProgress.current / fetchProgress.total) * 100)
        : 0
      progress = 50 + Math.round(detailProgress * 0.5) // 50% + (0-50% based on detail progress)
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex items-center justify-center">
        <Card className="max-w-md mx-4 bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50 p-8">
          <div className="text-center">
            <div className="relative w-28 h-28 mx-auto mb-6">
              <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                  r="42"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="50"
                cy="50"
                  r="42"
                  stroke="url(#gradient)"
                strokeWidth="8"
                fill="none"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                  className="transition-all duration-300"
                strokeLinecap="round"
              />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                  {progress}%
                </span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {progressMessage}
            </h2>
            {isFetchingDetails && (
              <p className="text-sm text-gray-600 mb-6">
                Atlarınızın detaylı verileri TJK sisteminden alınıyor
              </p>
            )}
          {fetchProgress.currentHorse && (
              <div className="bg-gradient-to-br from-indigo-50/60 via-indigo-50/40 to-white border-2 border-indigo-100/50 rounded-lg p-3 mb-4 shadow-lg">
                <p className="text-xs text-gray-600 mb-1">Ekleniyor:</p>
                <p className="font-semibold text-indigo-900">{fetchProgress.currentHorse}</p>
              </div>
          )}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-2">
              <span className="font-semibold">{fetchProgress.current}</span>
              <span>/</span>
              <span>{fetchProgress.total}</span>
              <span>at eklendi</span>
            </div>
            <p className="text-xs text-gray-500 mt-4">
            Bu işlem birkaç dakika sürebilir...
          </p>
        </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex flex-nowrap items-start justify-center px-3 pt-8 pb-10 w-full overflow-x-hidden">
      <Card className="w-full max-w-full sm:max-w-2xl bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50 flex flex-col flex-nowrap max-h-[90vh] overflow-hidden">
        <CardHeader className="space-y-4 flex-shrink-0">
          <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-2xl flex items-center justify-center shadow-lg mx-auto">
            <Download className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              {TR.onboarding.importHorses}
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
            {TR.onboarding.importHorsesDesc}
          </CardDescription>
          </div>
          {allHorses.length > 0 && (
            <>
              {/* Controls - count badge, search and select all */}
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1.5 h-9 rounded-lg text-xs bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white whitespace-nowrap min-w-[100px] text-center flex items-center justify-center">
                  {searchQuery.trim() ? `${horses.length} / ${allHorses.length} at bulundu` : `${horses.length} at bulundu`}
                </span>
                <div className="flex items-center gap-2">
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
                  <div className="relative w-36">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="At ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-8 h-9 text-sm border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
                      autoFocus
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="border-[#6366f1] text-[#6366f1] hover:bg-indigo-50 whitespace-nowrap h-9"
                >
                  {horses.every((h) => h.selected)
                    ? 'Seçimi Temizle'
                    : TR.common.selectAll}
                </Button>
                </div>
              </div>
            </>
          )}
        </CardHeader>
        <CardContent className="flex flex-col flex-nowrap gap-4 px-4 pb-6 sm:px-6 sm:pb-6 flex-1 min-h-0 w-full overflow-hidden">
          {allHorses.length === 0 ? (
            <div className="text-center py-12 flex-shrink-0">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-700 font-medium mb-2">TJK'da kayıtlı atınız bulunamadı.</p>
              <p className="text-sm text-gray-500">Manuel olarak at ekleyebilirsiniz.</p>
            </div>
          ) : horses.length === 0 ? (
            <div className="text-center py-12 flex-shrink-0">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-700 font-medium mb-2">Arama sonucu bulunamadı.</p>
              <p className="text-sm text-gray-500">Farklı bir arama terimi deneyin.</p>
            </div>
          ) : (
            <>
              {/* Scrollable horse list */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col flex-nowrap w-full">
                <div className="overflow-y-auto overflow-x-hidden space-y-2 pr-1">
                  {horses.map((horse, index) => (
                    <div
                      key={horse.externalRef || horse.name || index}
                      className={`flex flex-nowrap items-center space-x-3 py-2 px-3 border-2 rounded-lg hover:shadow-md cursor-pointer transition-all duration-200 ${
                        horse.selected 
                          ? 'border-[#6366f1] bg-indigo-50/50' 
                          : horse.isImported
                          ? 'border-green-200 bg-green-50/50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      onClick={() => toggleHorse(index)}
                    >
                      <Checkbox
                        checked={horse.selected}
                        onCheckedChange={() => toggleHorse(index)}
                        className="data-[state=checked]:bg-[#6366f1] data-[state=checked]:border-[#6366f1] flex-shrink-0"
                      />
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-nowrap">
                          <p className="font-semibold text-sm text-gray-900 truncate">{horse.name}</p>
                          {horse.isImported && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full whitespace-nowrap">
                              Eklenmiş
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 text-xs text-gray-600 mt-0.5">
                          {horse.yob && (
                            <span>
                              <span className="font-medium">Doğum Tarihi:</span> {horse.yob}
                            </span>
                          )}
                          {(horse.sire && horse.dam) && (
                            <div className="flex items-start gap-1 w-full text-ellipsis overflow-hidden">
                              <span className="font-medium flex-shrink-0">Orijin:</span>
                              <span className="truncate block max-w-full">
                                {horse.sire} - {horse.dam}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Fixed button section */}
          <div className="flex justify-end pt-4 border-t border-gray-200 mt-auto flex-shrink-0">
            <Button
              onClick={handleImport}
              disabled={isImporting || allHorses.filter((h) => h.selected).length === 0}
              className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isImporting
                ? TR.common.loading
                : `Atları Ekle (${allHorses.filter((h) => h.selected).length})`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

