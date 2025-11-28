'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Checkbox } from '@/app/components/ui/checkbox'
import { Input } from '@/app/components/ui/input'
import { Dialog, DialogContent } from '@/app/components/ui/dialog'
import { Download, Search, X, UserPlus, MapPin, Check } from 'lucide-react'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'

type LocationType = 'racecourse' | 'farm'

interface ImportedHorse {
  id: string
  name: string
  yob?: number | null
  sireName?: string | null
  damName?: string | null
}

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

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddHorseModal({ open, onClose, onSuccess }: Props) {
  const router = useRouter()
  const [horses, setHorses] = useState<Horse[]>([])
  const [allHorses, setAllHorses] = useState<Horse[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [ownerRef, setOwnerRef] = useState<string | null>(null)
  const [existingHorseRefs, setExistingHorseRefs] = useState<Set<string>>(new Set())
  const [currentStep, setCurrentStep] = useState<'select' | 'locations'>('select')
  const [importedHorses, setImportedHorses] = useState<ImportedHorse[]>([])
  const [locationSelections, setLocationSelections] = useState<Record<string, LocationType>>({})
  const [isSavingLocations, setIsSavingLocations] = useState(false)

  const getDefaultLocationType = (horse: { name: string; yob?: number | null }) => {
    const currentYear = new Date().getFullYear()
    const yobNumber =
      typeof horse.yob === 'string'
        ? parseInt(horse.yob, 10)
        : typeof horse.yob === 'number'
        ? horse.yob
        : undefined
    const age = yobNumber ? currentYear - yobNumber : undefined
    if (horse.name?.trim().endsWith('Tayı')) {
      return 'farm'
    }
    if (age !== undefined && age >= 9) {
      return 'farm'
    }
    return 'racecourse'
  }

  useEffect(() => {
    if (open) {
      // First fetch existing horses, then fetch from TJK
      const loadData = async () => {
        const refs = await fetchExistingHorses()
        await fetchHorses(refs)
      }
      loadData()
    } else {
      // Reset state when modal closes
      setHorses([])
      setAllHorses([])
      setSearchQuery('')
      setIsSearchOpen(false)
      setIsLoading(true)
      setIsImporting(false)
      setExistingHorseRefs(new Set())
      setCurrentStep('select')
      setImportedHorses([])
      setLocationSelections({})
      setIsSavingLocations(false)
    }
  }, [open])

  const fetchExistingHorses = async (): Promise<Set<string>> => {
    try {
      const response = await fetch('/api/horses', {
        credentials: 'include',
      })
      const data = await response.json()

      if (response.ok && data.horses) {
        // Create a set of externalRefs for quick lookup
        const refs = new Set<string>()
        data.horses.forEach((horse: any) => {
          if (horse.externalRef) {
            refs.add(horse.externalRef)
          }
        })
        setExistingHorseRefs(refs)
        return refs
      }
    } catch (error) {
      console.error('Error fetching existing horses:', error)
    }
    return new Set<string>()
  }

  const fetchHorses = async (existingRefs: Set<string>) => {
    setIsLoading(true)
    try {
      // Get the current user's owner profile
      const userResponse = await fetch('/api/auth/me', {
        credentials: 'include',
      })
      const userData = await userResponse.json()

      if (!userResponse.ok || !userData.user?.ownerProfile?.officialName) {
        throw new Error('Sahip bilgisi bulunamadı')
      }

      const ownerName = userData.user.ownerProfile.officialName
      const ownerRefValue = userData.user.ownerProfile.officialRef
      setOwnerRef(ownerRefValue)

      if (!ownerRefValue) {
        toast.error('TJK ID bulunamadı. Lütfen sahip bilgilerinizi kontrol edin.')
        setHorses([])
        return
      }

      // Fetch horses from TJK
      const params = new URLSearchParams({
        ownerName,
        ownerRef: ownerRefValue,
      })
      const tjkUrl = `/api/tjk/horses?${params.toString()}`
      const response = await fetch(tjkUrl)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Atlar yüklenemedi')
      }

      // Map to our format and mark imported horses
      const fetchedHorses = (data.horses || []).map((horse: any) => ({
        ...horse,
        selected: false,
        isImported: existingRefs.has(horse.externalRef || ''),
      }))

      // Sort: imported horses first (prioritized), then alphabetically within each group
      const sortedHorses = [...fetchedHorses].sort((a, b) => {
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

      setAllHorses(sortedHorses)
      setHorses(sortedHorses)

      if (sortedHorses.length === 0) {
        toast.info('TJK\'da kayıtlı atınız bulunamadı')
      }
    } catch (error) {
      console.error('Fetch horses error:', error)
      toast.error('Atlar yüklenirken bir hata oluştu')
    } finally {
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
    
    // Don't allow toggling imported horses
    if (horse.isImported) {
      return
    }

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
    // Only select unimported horses
    const unimportedHorses = horses.filter((h) => !h.isImported)
    const allSelected = unimportedHorses.length > 0 && unimportedHorses.every((h) => h.selected)
    const updatedSelection = !allSelected
    
    // Update all horses (both filtered and all)
    const updatedAllHorses = allHorses.map((h) => {
      const isInFiltered = horses.some((fh) => fh.externalRef === h.externalRef && fh.name === h.name)
      const isUnimported = !h.isImported
      return isInFiltered && isUnimported ? { ...h, selected: updatedSelection } : h
    })
    setAllHorses(updatedAllHorses)
    
    const updatedHorses = horses.map((h) => {
      const isUnimported = !h.isImported
      return isUnimported ? { ...h, selected: updatedSelection } : h
    })
    setHorses(updatedHorses)
  }

  const handleImport = async () => {
    const selectedHorses = allHorses.filter((h) => h.selected && !h.isImported)

    if (selectedHorses.length === 0) {
      toast.error('Lütfen en az bir at seçin')
      return
    }

    setIsImporting(true)

    try {
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

      toast.success(`${selectedHorses.length} at başarıyla eklendi`)

      // Start background fetch for detailed data
      const horsesWithRef = data.horses.filter((h: any) => h.externalRef)
      
      if (horsesWithRef.length > 0) {
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
        })
      }

      const newlyImported: ImportedHorse[] = data.horses || []
      const initialSelections: Record<string, LocationType> = {}
      newlyImported.forEach((horse) => {
        initialSelections[horse.id] = getDefaultLocationType(horse)
      })

      setImportedHorses(newlyImported)
      setLocationSelections(initialSelections)
      setIsImporting(false)
      setCurrentStep('locations')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
      setIsImporting(false)
    }
  }

  const handleLocationToggle = (horseId: string, type: LocationType) => {
    setLocationSelections((prev) => ({
      ...prev,
      [horseId]: type,
    }))
  }

  const handleSaveLocations = async () => {
    setIsSavingLocations(true)
    try {
      await Promise.all(
        importedHorses.map(async (horse) => {
          const locationType = locationSelections[horse.id] || 'racecourse'
          const response = await fetch(`/api/horses/${horse.id}/location`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              locationType,
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
      )

      toast.success('Konumlar kaydedildi')
      setCurrentStep('select')
      setImportedHorses([])
      setLocationSelections({})
      onSuccess()
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
    } finally {
      setIsSavingLocations(false)
    }
  }

  const selectedCount = allHorses.filter((h) => h.selected && !h.isImported).length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-full sm:max-w-md max-h-[90vh] p-0 bg-indigo-50/95 backdrop-blur-sm border border-gray-200/50 shadow-xl overflow-hidden flex flex-col flex-nowrap">
        {currentStep === 'select' ? (
          <Card className="border-0 shadow-none flex flex-col flex-nowrap h-full max-h-[90vh]">
            <CardHeader className="space-y-4 flex-shrink-0 flex-nowrap">
              <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                <Download className="h-8 w-8 text-white" />
              </div>
              <div className="text-center">
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                  Atlarınızı Ekürinize Ekleyin
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  TJK sisteminden atlarınızı seçin ve ekürinize ekleyin
                </CardDescription>
              </div>
              {!isLoading && allHorses.length > 0 && (
                <>
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
                        {horses.filter((h) => !h.isImported).every((h) => h.selected) && horses.filter((h) => !h.isImported).length > 0
                          ? 'Seçimi Temizle'
                          : TR.common.selectAll}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardHeader>
            <CardContent className="flex flex-col flex-nowrap gap-4 px-4 pb-6 sm:px-6 sm:pb-6 flex-1 min-h-0 w-full overflow-hidden">
              {isLoading ? (
                <div className="text-center py-12 flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
                  </div>
                  <p className="text-gray-900 font-bold text-lg mb-2">{TR.common.loading}</p>
                  <p className="text-sm text-gray-600">TJK sisteminden atlarınız getiriliyor...</p>
                </div>
              ) : allHorses.length === 0 ? (
                <div className="text-center py-12 flex-shrink-0">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Download className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-gray-700 font-medium mb-2">TJK&apos;da kayıtlı atınız bulunamadı.</p>
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
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col flex-nowrap w-full">
                    <div className="overflow-y-auto overflow-x-hidden space-y-2 pr-1 w-full">
                      {horses.map((horse, index) => (
                        <div
                          key={horse.externalRef || horse.name || index}
                          className={`flex flex-nowrap items-center gap-3 py-2 px-3 border-2 rounded-lg transition-all duration-200 w-full ${
                            horse.isImported
                              ? 'border-green-200 bg-green-50/50 cursor-not-allowed'
                              : horse.selected
                              ? 'border-[#6366f1] bg-indigo-50/50 hover:shadow-md cursor-pointer'
                              : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md cursor-pointer'
                          }`}
                          onClick={() => !horse.isImported && toggleHorse(index)}
                        >
                          <Checkbox
                            checked={horse.selected}
                            disabled={horse.isImported}
                            onCheckedChange={() => !horse.isImported && toggleHorse(index)}
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
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-gray-900 truncate">{horse.name}</p>
                              {horse.isImported && (
                                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full whitespace-nowrap">
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

              <div className="flex justify-end pt-4 border-t border-gray-200 mt-auto flex-shrink-0">
                <Button
                  onClick={handleImport}
                  disabled={isImporting || selectedCount === 0}
                  className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isImporting ? TR.common.loading : `Atları Ekle (${selectedCount})`}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-none flex flex-col flex-nowrap h-full max-h-[90vh]">
            <CardHeader className="space-y-4 flex-shrink-0 flex-nowrap">
              <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <div className="text-center">
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                  Konum Belirleyin
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  {importedHorses.length > 0
                    ? `${importedHorses.length} at için Hipodrom veya Çiftlik seçin`
                    : 'Tüm atlar için konum bilgisi girildi'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-nowrap gap-4 px-4 pb-6 sm:px-6 sm:pb-6 flex-1 min-h-0 w-full overflow-hidden">
              {importedHorses.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1">
                  <Check className="h-16 w-16 text-green-500 mb-4" />
                  <p className="text-gray-700 font-medium mb-2">Tüm atlar için konum bilgisi girildi</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 pr-1 w-full">
                    {importedHorses.map((horse) => {
                      const selection = locationSelections[horse.id] || 'racecourse'
                      return (
                        <div key={horse.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                          <div className="flex flex-nowrap items-center gap-3 py-2 px-3 border-2 rounded-lg border-gray-200 bg-white flex-1">
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
                                <div className="text-xs text-gray-600 mt-0.5">{horse.yob}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 py-3 px-4 border-2 rounded-lg border-gray-200 bg-white flex-1 justify-start sm:justify-end">
                            <label className="flex items-center space-x-1.5 cursor-pointer flex-1 min-w-[140px]">
                              <input
                                type="radio"
                                name={`location-type-${horse.id}`}
                                value="racecourse"
                                checked={selection === 'racecourse'}
                                onChange={() => handleLocationToggle(horse.id, 'racecourse')}
                                className="w-4 h-4 text-[#6366f1] focus:ring-[#6366f1] cursor-pointer"
                                disabled={isSavingLocations}
                              />
                              <span className="text-gray-700 text-sm font-medium">Hipodrom</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer flex-1 min-w-[140px]">
                              <input
                                type="radio"
                                name={`location-type-${horse.id}`}
                                value="farm"
                                checked={selection === 'farm'}
                                onChange={() => handleLocationToggle(horse.id, 'farm')}
                                className="w-4 h-4 text-[#6366f1] focus:ring-[#6366f1] cursor-pointer"
                                disabled={isSavingLocations}
                              />
                              <span className="text-gray-700 text-sm font-medium">Çiftlik</span>
                            </label>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="pt-4 mt-auto flex-shrink-0">
                    <Button
                      type="button"
                      onClick={handleSaveLocations}
                      disabled={isSavingLocations}
                      className="w-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingLocations ? 'Kaydediliyor...' : 'Konumları Kaydet'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}

