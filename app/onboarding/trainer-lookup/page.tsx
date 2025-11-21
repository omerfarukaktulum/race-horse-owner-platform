'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Search, Check, User, UserCircle } from 'lucide-react'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'

interface TrainerResult {
  id: string
  name: string
}

export default function TrainerLookupPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<TrainerResult[]>([])
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        await searchTrainers()
      } else {
        setResults([])
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const searchTrainers = async () => {
    setIsSearching(true)
    try {
      const response = await fetch(
        `/api/trainers/search?q=${encodeURIComponent(searchQuery.toUpperCase())}`
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
    if (!selectedTrainer) {
      toast.error('Lütfen bir antrenör seçin')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/onboarding/trainer-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fullName: selectedTrainer.name,
          tjkTrainerId: selectedTrainer.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Profil oluşturulamadı')
      }

      toast.success('Antrenör profili oluşturuldu')
      router.replace('/app/home')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-3 pt-8 pb-10 w-full overflow-x-hidden flex justify-center flex-nowrap">
      <Card className="w-full max-w-[360px] sm:max-w-md bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50 flex flex-col flex-nowrap mx-auto self-start">
        <CardHeader className="text-center space-y-4 flex-shrink-0 flex-nowrap">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
              <User className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-600">
              Antrenör Adınızı Bulun
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Lütfen TJK'daki resmi antrenör adınızı yazın
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-nowrap gap-4 px-4 pb-6 sm:px-6 sm:pb-6 w-full overflow-x-hidden flex-shrink-0">
          {/* Fixed input section */}
          <div className="space-y-2 flex-shrink-0 w-full">
            <Label htmlFor="search" className="text-gray-700 font-medium">
              Antrenör Ara
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Antrenör adınızı yazın..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                inputMode="search"
              />
            </div>
            {isSearching && (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></span>
                Aranıyor...
              </p>
            )}
          </div>

          {/* Dynamic results section - grows with content, scrollable if too many */}
          {results.length > 0 && (
            <div className="flex flex-col flex-nowrap space-y-3 flex-shrink-0 w-full">
              <Label className="text-gray-700 font-medium">Antrenör Seç</Label>
              <div className="max-h-[400px] overflow-y-auto overflow-x-hidden pr-1 space-y-2 w-full">
                {results.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedTrainer(result)}
                    className={`w-full min-w-0 p-4 text-left border-2 rounded-lg transition-all duration-300 bg-gradient-to-br from-emerald-50/60 via-emerald-50/40 to-white shadow-lg ${
                      selectedTrainer?.id === result.id
                        ? 'border-emerald-500 shadow-xl from-emerald-50/80 via-emerald-50/60 to-white'
                        : 'border-emerald-100/50 hover:border-emerald-200 hover:shadow-xl'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 flex-nowrap">
                      <div className="flex items-center gap-3 flex-1 min-w-0 flex-nowrap">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-gray-200 overflow-hidden bg-white flex items-center justify-center">
                          <UserCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 break-words">{result.name}</p>
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            TJK ID: {result.id}
                          </p>
                        </div>
                      </div>
                      {selectedTrainer?.id === result.id && (
                        <div className="flex-shrink-0 ml-3">
                          <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
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
              disabled={!selectedTrainer || isSubmitting}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6"
            >
              {isSubmitting ? TR.common.loading : TR.common.next}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

