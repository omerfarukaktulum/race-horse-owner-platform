'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Search, Check, UserSearch } from 'lucide-react'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'

interface OwnerResult {
  label: string
  officialName: string
  externalRef?: string
  sampleHorse?: string // One horse to help verify the owner
}

export default function OwnerLookupPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<OwnerResult[]>([])
  const [selectedOwner, setSelectedOwner] = useState<OwnerResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        await searchOwners()
      } else {
        setResults([])
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const searchOwners = async () => {
    setIsSearching(true)
    try {
      const response = await fetch(
        `/api/tjk/owners?q=${encodeURIComponent(searchQuery.toUpperCase())}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Arama başarısız')
      }

      setResults(data.results || [])
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Arama sırasında bir hata oluştu')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedOwner) {
      toast.error('Lütfen bir sahip seçin')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/onboarding/owner-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          officialName: selectedOwner.officialName,
          officialRef: selectedOwner.externalRef,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Profil oluşturulamadı')
      }

      toast.success('At Sahibi profili oluşturuldu')
      // Don't reset isSubmitting - let navigation happen with loading state
      router.replace('/onboarding/stablemate-setup')
      // Navigation will unmount the component, so no need to reset state
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
      setIsSubmitting(false) // Only reset on error
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex items-start justify-center p-4 pt-8">
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50 flex flex-col max-h-[90vh]">
        <CardHeader className="text-center space-y-4 flex-shrink-0">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <UserSearch className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              {TR.onboarding.ownerLookup}
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {TR.onboarding.ownerLookupDesc}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col p-6">
          {/* Fixed input section */}
          <div className="space-y-2 flex-shrink-0 mb-4">
            <Label htmlFor="search" className="text-gray-700 font-medium">
              {TR.onboarding.searchOwner}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Sahip adınızı yazın (en az 2 karakter)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
                disabled={isSearching}
              />
            </div>
            {isSearching && (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#6366f1]"></span>
                Aranıyor...
              </p>
            )}
          </div>

          {/* Dynamic results section - grows with content, scrollable if too many */}
          {results.length > 0 && (
            <div className="flex flex-col space-y-3 mb-4 flex-shrink-0">
              <Label className="text-gray-700 font-medium">{TR.onboarding.selectOwner}</Label>
              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                {results.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedOwner(result)}
                    className={`w-full p-4 text-left border-2 rounded-lg transition-all duration-300 bg-gradient-to-br from-indigo-50/60 via-indigo-50/40 to-white shadow-lg ${
                      selectedOwner?.officialName === result.officialName
                        ? 'border-[#6366f1] shadow-xl from-indigo-50/80 via-indigo-50/60 to-white'
                        : 'border-indigo-100/50 hover:border-indigo-200 hover:shadow-xl'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {result.externalRef && (
                          <div className="flex-shrink-0 w-12 h-12 rounded border-2 border-gray-200 overflow-hidden bg-white">
                            <img
                              src={`https://medya-cdn.tjk.org/formaftp/${result.externalRef}.jpg`}
                              alt="Eküri Forması"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{result.officialName}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            TJK ID: {result.externalRef}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Bir sonraki adımda eküri kurulumunu yapacaksınız.
                          </p>
                        </div>
                      </div>
                      {selectedOwner?.officialName === result.officialName && (
                        <div className="flex-shrink-0 ml-3">
                          <div className="w-6 h-6 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fixed button section */}
          <div className="flex justify-end pt-4 flex-shrink-0">
            <Button
              onClick={handleSubmit}
              disabled={!selectedOwner || isSubmitting}
              className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6"
            >
              {isSubmitting ? TR.common.loading : TR.common.next}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

