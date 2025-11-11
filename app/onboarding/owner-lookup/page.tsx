'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Search, Check } from 'lucide-react'
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

      toast.success('Sahip profili oluşturuldu')
      router.push('/onboarding/stablemate-setup')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{TR.onboarding.ownerLookup}</CardTitle>
          <CardDescription>
            {TR.onboarding.ownerLookupDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="search">{TR.onboarding.searchOwner}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Sahip adınızı yazın (en az 2 karakter)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {isSearching && (
              <p className="text-sm text-gray-500">Aranıyor...</p>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              <Label>{TR.onboarding.selectOwner}</Label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedOwner(result)}
                    className={`w-full p-4 text-left border rounded-lg hover:bg-blue-50 transition-colors ${
                      selectedOwner?.officialName === result.officialName
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{result.officialName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          TJK ID: {result.externalRef}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Bir sonraki adımda atlarınızı içe aktarabileceksiniz.
                        </p>
                      </div>
                      {selectedOwner?.officialName === result.officialName && (
                        <Check className="h-5 w-5 text-blue-600 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              onClick={handleSubmit}
              disabled={!selectedOwner || isSubmitting}
            >
              {isSubmitting ? TR.common.loading : TR.common.next}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

