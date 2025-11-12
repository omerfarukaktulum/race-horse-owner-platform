'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Checkbox } from '@/app/components/ui/checkbox'
import { Label } from '@/app/components/ui/label'
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
}

export default function ImportHorsesPage() {
  const router = useRouter()
  const [horses, setHorses] = useState<Horse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)

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
      const ownerRef = userData.user.ownerProfile.officialRef

      console.log('Step 5: Owner info extracted:', { ownerName, ownerRef })

      if (!ownerRef) {
        console.error('Step 6: FAILED - No TJK ID found')
        toast.error('TJK ID bulunamadı. Lütfen sahip bilgilerinizi kontrol edin.')
        setHorses([])
        return
      }

      // Use our API route as proxy to avoid CORS issues
      const params = new URLSearchParams({
        ownerName,
        ownerRef,
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

      const horses = (data.horses || []).map((horse: any) => ({
        ...horse,
        selected: false,
      }))

      console.log('Step 11: Mapped horses:', horses.length, 'horses')
      console.log('Horses data:', JSON.stringify(horses, null, 2))
      
      setHorses(horses)

      if (horses.length > 0) {
        console.log('Step 12: SUCCESS - Showing', horses.length, 'horses')
        toast.success(`${horses.length} at bulundu`)
      } else {
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

  const toggleHorse = (index: number) => {
    setHorses(
      horses.map((horse, i) =>
        i === index ? { ...horse, selected: !horse.selected } : horse
      )
    )
  }

  const selectAll = () => {
    const allSelected = horses.every((h) => h.selected)
    setHorses(horses.map((h) => ({ ...h, selected: !allSelected })))
  }

  const handleImport = async () => {
    const selectedHorses = horses.filter((h) => h.selected)

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
            externalRef: h.externalRef,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Atlar eklenemedi')
      }

      toast.success(`${selectedHorses.length} at başarıyla eklendi`)
      router.push('/app/home')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
    } finally {
      setIsImporting(false)
    }
  }

  const skip = () => {
    router.push('/app/home')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium mb-2">{TR.common.loading}</p>
          <p className="text-sm text-gray-500">
            TJK sisteminden atlarınız getiriliyor...
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Bu işlem 5-10 saniye sürebilir
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{TR.onboarding.importHorses}</CardTitle>
          <CardDescription>
            {TR.onboarding.importHorsesDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {horses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>TJK'da kayıtlı atınız bulunamadı.</p>
              <p className="text-sm mt-2">Manuel olarak at ekleyebilirsiniz.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  {TR.onboarding.selectHorsesToImport} ({horses.length} at bulundu)
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                >
                  {horses.every((h) => h.selected)
                    ? 'Seçimi Temizle'
                    : TR.common.selectAll}
                </Button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {horses.map((horse, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleHorse(index)}
                  >
                    <Checkbox
                      checked={horse.selected}
                      onCheckedChange={() => toggleHorse(index)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{horse.name}</p>
                      <div className="text-sm text-gray-500">
                        {horse.yob && (
                          <p>Doğum Yılı: {horse.yob}</p>
                        )}
                        {(horse.sire && horse.dam) && (
                          <p>Orijin: {horse.sire} - {horse.dam}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={skip}
              disabled={isImporting}
            >
              Daha Sonra
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || horses.filter((h) => h.selected).length === 0}
            >
              {isImporting
                ? TR.common.loading
                : `Atları Ekle (${horses.filter((h) => h.selected).length})`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

