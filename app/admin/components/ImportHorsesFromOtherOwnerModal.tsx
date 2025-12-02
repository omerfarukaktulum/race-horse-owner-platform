'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { Checkbox } from '@/app/components/ui/checkbox'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Search, UserPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface OwnerResult {
  label: string
  officialName: string
  externalRef: string
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

interface ImportHorsesFromOtherOwnerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  currentOwnerName: string
  onSuccess?: () => void
}

export default function ImportHorsesFromOtherOwnerModal({
  open,
  onOpenChange,
  userId,
  currentOwnerName,
  onSuccess,
}: ImportHorsesFromOtherOwnerModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [ownerResults, setOwnerResults] = useState<OwnerResult[]>([])
  const [isSearchingOwners, setIsSearchingOwners] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState<OwnerResult | null>(null)
  const [horses, setHorses] = useState<Horse[]>([])
  const [allHorses, setAllHorses] = useState<Horse[]>([])
  const [isLoadingHorses, setIsLoadingHorses] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Search owners when query changes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setOwnerResults([])
      setSelectedOwner(null)
      setHorses([])
      setAllHorses([])
      return
    }

    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        await searchOwners()
      } else {
        setOwnerResults([])
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, open])

  const searchOwners = async () => {
    setIsSearchingOwners(true)
    try {
      const response = await fetch(
        `/api/tjk/owners?q=${encodeURIComponent(searchQuery.toUpperCase())}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Sahip araması başarısız')
      }

      setOwnerResults(data.results || [])
    } catch (error) {
      console.error('Search owners error:', error)
      toast.error('Sahip araması sırasında bir hata oluştu')
      setOwnerResults([])
    } finally {
      setIsSearchingOwners(false)
    }
  }

  const handleSelectOwner = async (owner: OwnerResult) => {
    setSelectedOwner(owner)
    setSearchQuery('') // Clear search to show horses
    await fetchHorses(owner)
  }

  const fetchHorses = async (owner: OwnerResult) => {
    setIsLoadingHorses(true)
    try {
      // Set admin target user cookie
      document.cookie = `admin-target-user-id=${userId}; path=/; max-age=3600`

      // Fetch horses using admin Playwright endpoint
      const params = new URLSearchParams({
        ownerName: owner.officialName,
        ownerRef: owner.externalRef,
      })

      const response = await fetch(`/api/admin/tjk/horses?${params}`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'BROWSER_UNAVAILABLE' || data.message) {
          toast.warning(data.message || 'Otomatik at yükleme şu anda kullanılamıyor.')
          setHorses([])
          setAllHorses([])
          setIsLoadingHorses(false)
          return
        }
        throw new Error(data.error || 'Atlar yüklenemedi')
      }

      if (data.message && (!data.horses || data.horses.length === 0)) {
        toast.info(data.message)
      }

      // Fetch existing horses to check which ones are already imported
      let existingHorses: any[] = []
      let existingExternalRefs = new Set<string>()
      
      try {
        const existingHorsesResponse = await fetch('/api/admin/horses', {
          credentials: 'include',
        })
        const existingHorsesData = await existingHorsesResponse.json()
        
        if (existingHorsesResponse.ok) {
          existingHorses = existingHorsesData.horses || []
          existingExternalRefs = new Set(
            existingHorses
              .map((h: any) => h.externalRef)
              .filter((ref: any) => ref)
          )
        }
      } catch (error) {
        console.log('No existing horses found:', error)
      }

      // Map to our format
      const horses = (data.horses || []).map((horse: any) => ({
        ...horse,
        selected: false,
        isImported: horse.externalRef ? existingExternalRefs.has(horse.externalRef) : false,
      }))

      // Sort: imported horses first, then alphabetically
      const sortedHorses = [...horses].sort((a, b) => {
        if (a.isImported && !b.isImported) return -1
        if (!a.isImported && b.isImported) return 1
        return a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' })
      })

      setAllHorses(sortedHorses)
      setHorses(sortedHorses)

      if (horses.length === 0) {
        toast.info('Bu sahip için TJK\'da kayıtlı at bulunamadı')
      }
    } catch (error) {
      console.error('Fetch horses error:', error)
      toast.error('Atlar yüklenirken bir hata oluştu')
      setHorses([])
      setAllHorses([])
    } finally {
      setIsLoadingHorses(false)
    }
  }

  const toggleHorse = (index: number) => {
    const horse = horses[index]
    const allHorsesIndex = allHorses.findIndex((h) => h.externalRef === horse.externalRef && h.name === horse.name)
    if (allHorsesIndex !== -1) {
      const updatedAllHorses = [...allHorses]
      updatedAllHorses[allHorsesIndex] = { ...updatedAllHorses[allHorsesIndex], selected: !updatedAllHorses[allHorsesIndex].selected }
      setAllHorses(updatedAllHorses)
      
      const updatedHorses = [...horses]
      updatedHorses[index] = { ...updatedHorses[index], selected: !updatedHorses[index].selected }
      setHorses(updatedHorses)
    }
  }

  const selectAll = () => {
    const allSelected = horses.every((h) => h.selected)
    const updatedSelection = !allSelected
    
    const updatedAllHorses = allHorses.map((h) => {
      const isInFiltered = horses.some((fh) => fh.externalRef === h.externalRef && h.name === h.name)
      return isInFiltered ? { ...h, selected: updatedSelection } : h
    })
    setAllHorses(updatedAllHorses)
    
    const updatedHorses = horses.map((h) => ({ ...h, selected: updatedSelection }))
    setHorses(updatedHorses)
  }

  const handleImport = async () => {
    const selectedHorses = allHorses.filter((h) => h.selected && !h.isImported)

    if (selectedHorses.length === 0) {
      toast.error('Lütfen en az bir yeni at seçin')
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

      // Refresh and reset
      if (selectedOwner) {
        await fetchHorses(selectedOwner)
      }
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    document.cookie = 'admin-target-user-id=; path=/; max-age=0'
    onOpenChange(false)
  }

  const selectedCount = allHorses.filter((h) => h.selected && !h.isImported).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Başka Sahipten At İçe Aktar</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            {currentOwnerName} için başka bir sahibin atlarını içe aktarın
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedOwner ? (
            <>
              {/* Owner Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Sahip adı ara (en az 2 karakter)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Owner Results */}
              {isSearchingOwners && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              )}

              {!isSearchingOwners && ownerResults.length === 0 && searchQuery.length >= 2 && (
                <Card>
                  <CardContent className="pt-6 text-center text-gray-500">
                    Sahip bulunamadı
                  </CardContent>
                </Card>
              )}

              {!isSearchingOwners && ownerResults.length > 0 && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {ownerResults.map((owner) => (
                    <Card
                      key={owner.externalRef}
                      className="cursor-pointer hover:bg-indigo-50 transition-colors"
                      onClick={() => handleSelectOwner(owner)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{owner.officialName}</p>
                            <p className="text-xs text-gray-500">TJK ID: {owner.externalRef}</p>
                          </div>
                          <Button size="sm" variant="outline">
                            Seç
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Selected Owner Info */}
              <Card className="bg-indigo-50 border-indigo-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-indigo-900">Seçili Sahip: {selectedOwner.officialName}</p>
                      <p className="text-xs text-indigo-700">TJK ID: {selectedOwner.externalRef}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedOwner(null)
                        setHorses([])
                        setAllHorses([])
                      }}
                    >
                      Değiştir
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Select All */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={horses.length > 0 && horses.every((h) => h.selected || h.isImported)}
                    onCheckedChange={selectAll}
                    disabled={horses.length === 0 || isLoadingHorses}
                  />
                  <Label className="text-sm font-medium">Tümünü Seç</Label>
                </div>
                <div className="text-sm text-gray-600">
                  {selectedCount > 0 && (
                    <span className="font-medium text-indigo-600">{selectedCount} at seçildi</span>
                  )}
                </div>
              </div>

              {/* Loading Horses */}
              {isLoadingHorses && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Atlar yükleniyor...</p>
                  </div>
                </div>
              )}

              {/* Horses List */}
              {!isLoadingHorses && horses.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center text-gray-500">
                    Bu sahip için TJK&apos;da kayıtlı at bulunamadı
                  </CardContent>
                </Card>
              )}

              {!isLoadingHorses && horses.length > 0 && (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {horses.map((horse, index) => (
                    <Card
                      key={`${horse.externalRef || horse.name}-${index}`}
                      className={`cursor-pointer transition-colors ${
                        horse.isImported
                          ? 'bg-gray-50 opacity-75'
                          : horse.selected
                          ? 'bg-indigo-50 border-indigo-300'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => !horse.isImported && toggleHorse(index)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={horse.selected || horse.isImported}
                            onCheckedChange={() => !horse.isImported && toggleHorse(index)}
                            disabled={horse.isImported}
                            className="flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{horse.name}</span>
                              {horse.isImported && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                                  Eklenmiş
                                </span>
                              )}
                              {horse.yob && (
                                <span className="text-xs text-gray-500">({horse.yob})</span>
                              )}
                              {horse.gender && (
                                <span className="text-xs text-gray-500">{horse.gender}</span>
                              )}
                            </div>
                            {horse.externalRef && (
                              <p className="text-xs text-gray-500 mt-0.5">TJK ID: {horse.externalRef}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isImporting}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedCount === 0 || isImporting || isLoadingHorses}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Ekleniyor...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {selectedCount > 0 ? `${selectedCount} At Ekle` : 'At Ekle'}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

