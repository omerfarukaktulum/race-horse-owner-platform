'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Activity, Plus, DollarSign } from 'lucide-react'
import { TR } from '@/lib/constants/tr'
import { toast } from 'sonner'
import { formatDate, formatCurrency, getRelativeTime } from '@/lib/utils/format'

interface HorseData {
  id: string
  name: string
  yob?: number
  status: string
  gender?: string
  racecourse?: { name: string }
  farm?: { name: string }
  trainer?: { fullName: string }
  groomName?: string
  expenses: Array<{
    date: Date
    amount: number
    currency: string
  }>
}

export default function HorsesPage() {
  const [horses, setHorses] = useState<HorseData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ACTIVE')

  useEffect(() => {
    fetchHorses()
  }, [])

  const fetchHorses = async () => {
    try {
      console.log('[Horses Page] Fetching horses...')
      const response = await fetch('/api/horses')
      const data = await response.json()

      console.log('[Horses Page] Response status:', response.status)
      console.log('[Horses Page] Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Atlar yüklenemedi')
      }

      console.log('[Horses Page] Setting', data.horses?.length || 0, 'horses')
      setHorses(data.horses || [])
    } catch (error) {
      console.error('Fetch horses error:', error)
      toast.error('Atlar yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const filterHorses = (tab: string) => {
    const currentYear = new Date().getFullYear()
    let filtered: HorseData[] = []
    
    if (tab === 'ACTIVE') {
      filtered = horses.filter((horse) => horse.status === 'RACING')
    } else if (tab === 'FOALS') {
      // Foals: 0, 1, 2, 3 years old
      filtered = horses.filter((horse) => {
        if (!horse.yob) return false
        const age = currentYear - horse.yob
        return age >= 0 && age <= 3
      })
    } else if (tab === 'MARE') {
      filtered = horses.filter((horse) => {
        // Include horses with MARE status
        if (horse.status === 'MARE') return true
        
        // Also include girl horses (Dişi) over 7 years old
        if (horse.yob && horse.gender) {
          const age = currentYear - horse.yob
          const isGirl = horse.gender.includes('Dişi') || horse.gender.includes('DİŞİ') || 
                        horse.gender.includes('Kısrak') || horse.gender.includes('KISRAK')
          if (age > 7 && isGirl) return true
        }
        
        return false
      })
    } else if (tab === 'DEAD') {
      filtered = horses.filter((horse) => horse.status === 'DEAD')
    }
    
    // Sort by age ascending (youngest first), then alphabetically by name
    return filtered.sort((a, b) => {
      const ageA = a.yob ? currentYear - a.yob : 999
      const ageB = b.yob ? currentYear - b.yob : 999
      
      // First sort by age
      if (ageA !== ageB) {
        return ageA - ageB
      }
      
      // If ages are the same, sort alphabetically by name
      return a.name.localeCompare(b.name, 'tr')
    })
  }

  const HorseCard = ({ horse }: { horse: HorseData }) => {
    const lastExpense = horse.expenses[0]
    const age = horse.yob ? new Date().getFullYear() - horse.yob : null

    // Get gender label
    const getGenderLabel = () => {
      if (!horse.gender) return null
      if (horse.gender.includes('Erkek') || horse.gender.includes('ERKEK') || horse.gender.includes('Aygır') || horse.gender.includes('AYGIR')) {
        return { text: 'Erkek', color: 'bg-blue-100 text-blue-700 border-blue-200' }
      }
      if (horse.gender.includes('Dişi') || horse.gender.includes('DİŞİ') || horse.gender.includes('Kısrak') || horse.gender.includes('KISRAK')) {
        return { text: 'Dişi', color: 'bg-pink-100 text-pink-700 border-pink-200' }
      }
      return null
    }

    const genderLabel = getGenderLabel()

    // Get status label
    const getStatusLabel = () => {
      switch (horse.status) {
        case 'RACING':
          return { text: 'Yarışta', color: 'bg-green-100 text-green-700 border-green-200' }
        case 'STALLION':
          return { text: 'Aygır', color: 'bg-purple-100 text-purple-700 border-purple-200' }
        case 'MARE':
          return { text: 'Kısrak', color: 'bg-pink-100 text-pink-700 border-pink-200' }
        case 'DEAD':
          return { text: 'Öldü', color: 'bg-gray-100 text-gray-700 border-gray-200' }
        default:
          return { text: horse.status, color: 'bg-gray-100 text-gray-700 border-gray-200' }
      }
    }

    const statusLabel = getStatusLabel()

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <Link
                  href={`/app/horses/${horse.id}`}
                  className="hover:text-blue-600"
                >
                  {horse.name}
                </Link>
              </CardTitle>
              <CardDescription className="flex items-center gap-2 flex-wrap mt-1">
                {age !== null && (
                  <span>
                    {age} yaşında{horse.yob && ` (${horse.yob})`}
                  </span>
                )}
                {genderLabel && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${genderLabel.color}`}>
                    {genderLabel.text}
                  </span>
                )}
              </CardDescription>
            </div>
            <Link href={`/app/expenses/new?horseId=${horse.id}`}>
              <Button size="sm" variant="outline">
                <DollarSign className="h-4 w-4 mr-1" />
                Gider Ekle
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${statusLabel.color}`}>
              {statusLabel.text}
            </span>
          </div>

          {/* Metadata with colored labels */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {horse.status === 'RACING' && (
              <>
                {horse.racecourse && (
                  <div className="flex items-start space-x-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                      Hipodrom
                    </span>
                    <p className="font-medium text-gray-900">{horse.racecourse.name}</p>
                  </div>
                )}
                {horse.trainer && (
                  <div className="flex items-start space-x-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap">
                      Antrenör
                    </span>
                    <p className="font-medium text-gray-900">{horse.trainer.fullName}</p>
                  </div>
                )}
                {horse.groomName && (
                  <div className="flex items-start space-x-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-cyan-100 text-cyan-700 border border-cyan-200 whitespace-nowrap">
                      Seyis
                    </span>
                    <p className="font-medium text-gray-900">{horse.groomName}</p>
                  </div>
                )}
              </>
            )}
            {(horse.status === 'STALLION' || horse.status === 'MARE') && horse.farm && (
              <div className="flex items-start space-x-2">
                <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
                  Çiftlik
                </span>
                <p className="font-medium text-gray-900">{horse.farm.name}</p>
              </div>
            )}
          </div>
          {lastExpense && (
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Son Gider
                </span>
                <span className="text-xs text-gray-500">
                  {getRelativeTime(new Date(lastExpense.date))}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(Number(lastExpense.amount), lastExpense.currency)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{TR.common.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{TR.horses.title}</h1>
        <Link href="/app/horses/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {TR.horses.addHorse}
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ACTIVE">
            {TR.horses.active} ({filterHorses('ACTIVE').length})
          </TabsTrigger>
          <TabsTrigger value="FOALS">
            {TR.horses.foals} ({filterHorses('FOALS').length})
          </TabsTrigger>
          <TabsTrigger value="MARE">
            {TR.horses.mares} ({filterHorses('MARE').length})
          </TabsTrigger>
          <TabsTrigger value="DEAD">
            {TR.horses.dead} ({filterHorses('DEAD').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ACTIVE" className="space-y-4 mt-6">
          {filterHorses('ACTIVE').length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aktif atınız bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterHorses('ACTIVE').map((horse) => (
                <HorseCard key={horse.id} horse={horse} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="FOALS" className="space-y-4 mt-6">
          {filterHorses('FOALS').length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Tay atınız bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterHorses('FOALS').map((horse) => (
                <HorseCard key={horse.id} horse={horse} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="MARE" className="space-y-4 mt-6">
          {filterHorses('MARE').length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Kısrak atınız bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterHorses('MARE').map((horse) => (
                <HorseCard key={horse.id} horse={horse} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="DEAD" className="space-y-4 mt-6">
          {filterHorses('DEAD').length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Ölü atınız bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterHorses('DEAD').map((horse) => (
                <HorseCard key={horse.id} horse={horse} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

