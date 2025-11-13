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
      router.push('/onboarding/import-horses')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
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
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50">
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
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-medium">
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
                className="h-11 border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="foundationYear" className="text-gray-700 font-medium">
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
                className="h-11 border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-gray-700 font-medium">
                {TR.stablemate.location}
              </Label>
              <Input
                id="location"
                type="text"
                placeholder="Örn: İstanbul"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isSubmitting}
                className="h-11 border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-gray-700 font-medium">
                {TR.stablemate.website}
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={isSubmitting}
                className="h-11 border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="border-2 border-[#6366f1]/30 hover:bg-[#6366f1]/5 hover:border-[#6366f1]/50 text-[#6366f1]"
              >
                {TR.common.back}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isSubmitting ? TR.common.loading : TR.common.next}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

