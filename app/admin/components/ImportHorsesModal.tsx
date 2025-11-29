'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
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

interface ImportHorsesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ownerName: string
  ownerRef: string
  onSuccess?: () => void
}

export default function ImportHorsesModal({
  open,
  onOpenChange,
  userId,
  ownerName,
  ownerRef,
  onSuccess,
}: ImportHorsesModalProps) {
  const [horses, setHorses] = useState<Horse[]>([])
  const [allHorses, setAllHorses] = useState<Horse[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    if (open && ownerRef) {
      // Set admin target user cookie
      document.cookie = `admin-target-user-id=${userId}; path=/; max-age=3600`
      fetchHorses()
    } else if (!open) {
      // Clear cookie when modal closes
      document.cookie = 'admin-target-user-id=; path=/; max-age=0'
      setHorses([])
      setAllHorses([])
      setSearchQuery('')
    }
  }, [open, userId, ownerRef])

  const fetchHorses = async () => {
    setIsLoading(true)
    try {
      if (!ownerRef) {
        toast.error('TJK ID bulunamadı')
        setHorses([])
        setIsLoading(false)
        return
      }

      // Fetch horses using admin Playwright endpoint
      const params = new URLSearchParams({
        ownerName,
        ownerRef,
      })

      const response = await fetch(`/api/admin/tjk/horses?${params}`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'BROWSER_UNAVAILABLE' || data.message) {
          toast.warning(data.message || 'Otomatik at yükleme şu anda kullanılamıyor. Lütfen atları manuel olarak ekleyin.')
          setHorses([])
          setAllHorses([])
          setIsLoading(false)
          return
        }
        throw new Error(data.error || 'Atlar yüklenemedi')
      }

      // If API returns a message (e.g., no horses found), show it
      if (data.message && (!data.horses || data.horses.length === 0)) {
        toast.info(data.message)
      }

      // Fetch existing horses to check which ones are already imported
      // Use admin endpoint which respects database switch preference
      let existingHorses: any[] = []
      let existingExternalRefs = new Set<string>()
      
      try {
        const existingHorsesResponse = await fetch('/api/admin/horses', {
          credentials: 'include',
        })
        const existingHorsesData = await existingHorsesResponse.json()
        
        // If error is about no target user or no stablemate, that's okay - just means no horses yet
        if (existingHorsesResponse.ok) {
          existingHorses = existingHorsesData.horses || []
          existingExternalRefs = new Set(
            existingHorses
              .map((h: any) => h.externalRef)
              .filter((ref: any) => ref)
          )
        }
      } catch (error) {
        // If stablemate doesn't exist yet, that's fine - just means no horses imported yet
        console.log('No existing horses found (stablemate may not exist yet):', error)
      }

      // Map to our format
      const horses = (data.horses || []).map((horse: any) => ({
        ...horse,
        selected: false,
        isImported: horse.externalRef ? existingExternalRefs.has(horse.externalRef) : false,
      }))

      // Sort: imported horses first (prioritized), then alphabetically within each group
      const sortedHorses = [...horses].sort((a, b) => {
        // Priority 1: Imported horses always come first
        if (a.isImported && !b.isImported) {
          return -1
        }
        if (!a.isImported && b.isImported) {
          return 1
        }
        // Priority 2: Within the same group, sort alphabetically
        return a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' })
      })

      setAllHorses(sortedHorses)
      setHorses(sortedHorses)

      if (horses.length === 0) {
        toast.info('TJK\'da kayıtlı atınız bulunamadı')
      }
    } catch (error) {
      console.error('Fetch horses error:', error)
      toast.error('Atlar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.')
      setHorses([])
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
      // Maintain sort order: imported first, then alphabetically
      const sorted = [...filtered].sort((a, b) => {
        if (a.isImported && !b.isImported) return -1
        if (!a.isImported && b.isImported) return 1
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
      const isInFiltered = horses.some((fh) => fh.externalRef === h.externalRef && h.name === h.name)
      return isInFiltered ? { ...h, selected: updatedSelection } : h
    })
    setAllHorses(updatedAllHorses)
    
    const updatedHorses = horses.map((h) => ({ ...h, selected: updatedSelection }))
    setHorses(updatedHorses)
  }

  const handleImport = async () => {
    // Only import horses that are not already imported
    const selectedHorses = allHorses.filter((h) => h.selected && !h.isImported)

    if (selectedHorses.length === 0) {
      toast.error('Lütfen en az bir yeni at seçin (zaten eklenmiş atlar seçilemez)')
      return
    }

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

      toast.success(`${selectedHorses.length} at başarıyla eklendi`)

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
        })
      }

      // Refresh the horses list to show newly imported ones
      await fetchHorses()
      
      // Call success callback if provided
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

  const selectedCount = allHorses.filter((h) => h.selected && !h.isImported).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Atları İçe Aktar</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            {ownerName} için TJK&apos;dan atları yükleyin
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="At ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={horses.length > 0 && horses.every((h) => h.selected || h.isImported)}
                onCheckedChange={selectAll}
                disabled={horses.length === 0 || isLoading}
              />
              <Label className="text-sm font-medium">Tümünü Seç</Label>
            </div>
            <div className="text-sm text-gray-600">
              {selectedCount > 0 && (
                <span className="font-medium text-indigo-600">{selectedCount} at seçildi</span>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Atlar yükleniyor...</p>
              </div>
            </div>
          )}

          {/* Horses List */}
          {!isLoading && horses.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                TJK&apos;da kayıtlı at bulunamadı
              </CardContent>
            </Card>
          )}

          {!isLoading && horses.length > 0 && (
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
              onClick={() => onOpenChange(false)}
              disabled={isImporting}
            >
              İptal
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedCount === 0 || isImporting || isLoading}
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
        </div>
      </DialogContent>
    </Dialog>
  )
}

