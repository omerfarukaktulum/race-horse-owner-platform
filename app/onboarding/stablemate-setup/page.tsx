'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Settings } from 'lucide-react'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'

// Racecourse cities (shown first in dropdown)
const RACECOURSE_CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Şanlıurfa', 'Diyarbakır', 'Kocaeli',
  'Adana', 'Elazığ', 'Antalya', 'Gaziantep', 'Konya', 'Samsun',
]

// All Turkish cities (excluding racecourse cities to avoid duplicates)
const OTHER_CITIES = [
  'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Artvin', 'Aydın', 'Balıkesir',
  'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Çanakkale', 'Çankırı', 'Çorum',
  'Denizli', 'Edirne', 'Erzincan', 'Erzurum', 'Eskişehir', 'Giresun', 'Gümüşhane',
  'Hakkari', 'Hatay', 'Isparta', 'İçel', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli',
  'Kırşehir', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Siirt', 'Sinop', 'Sivas',
  'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yozgat', 'Zonguldak',
  'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale', 'Batman', 'Şırnak', 'Bartın',
  'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce',
]

// Combined list with racecourse cities first
const ALL_CITIES = [...RACECOURSE_CITIES, ...OTHER_CITIES]

export default function StablemateSetupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [foundationYear, setFoundationYear] = useState('2025')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Fetch user's official name and pre-fill the stablemate name
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.user?.ownerProfile?.officialName) {
            setName(data.user.ownerProfile.officialName)
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setIsLoadingUser(false)
      }
    }

    fetchUserData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/onboarding/stablemate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          foundationYear: foundationYear ? parseInt(foundationYear) : undefined,
          location,
          website: website || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Eküri oluşturulamadı')
      }

      toast.success('Eküri oluşturuldu')
      // Don't reset isSubmitting - let navigation happen with loading state
      router.replace('/onboarding/import-horses')
      // Navigation will unmount the component, so no need to reset state
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
      setIsSubmitting(false) // Only reset on error
    }
  }

  if (isLoadingUser) {
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <Settings className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              {TR.onboarding.setupStablemate}
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {TR.onboarding.setupStablemateDesc}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 flex flex-col items-center">
              <Label htmlFor="name" className="text-gray-700 font-medium w-full max-w-xs">
                {TR.stablemate.name} *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Örn: Mehmet Ali Eküri"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-11 w-full max-w-xs border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
              />
            </div>

            <div className="space-y-2 flex flex-col items-center">
              <Label htmlFor="foundationYear" className="text-gray-700 font-medium w-full max-w-xs">
                {TR.stablemate.foundationYear}
              </Label>
              <Input
                id="foundationYear"
                type="number"
                placeholder="Örn: 2020"
                value={foundationYear}
                onChange={(e) => setFoundationYear(e.target.value)}
                min="1900"
                max={new Date().getFullYear()}
                disabled={isSubmitting}
                className="h-11 w-full max-w-xs border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="space-y-2 flex flex-col items-center">
              <Label htmlFor="city" className="text-gray-700 font-medium w-full max-w-xs">
                Şehir
              </Label>
              <select
                id="city"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isSubmitting}
                className="flex h-11 w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Şehir seçin</option>
                {RACECOURSE_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
                {OTHER_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 flex flex-col items-center">
              <Label htmlFor="website" className="text-gray-700 font-medium w-full max-w-xs">
                {TR.stablemate.website}
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={isSubmitting}
                className="h-11 w-full max-w-xs border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
              />
            </div>

            <div className="flex justify-center pt-4">
              <div className="w-full max-w-xs flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isSubmitting ? TR.common.loading : TR.common.next}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

