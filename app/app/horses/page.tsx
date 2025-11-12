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
  const [activeTab, setActiveTab] = useState('RACING')

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

  const filterHorses = (status: string) => {
    return horses.filter((horse) => horse.status === status)
  }

  const HorseCard = ({ horse }: { horse: HorseData }) => {
    const lastExpense = horse.expenses[0]
    const age = horse.yob ? new Date().getFullYear() - horse.yob : null

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
              <CardDescription>
                {age && `${age} yaşında`}
                {horse.yob && ` (${horse.yob})`}
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
          <div className="grid grid-cols-2 gap-3 text-sm">
            {horse.status === 'RACING' && (
              <>
                {horse.racecourse && (
                  <div>
                    <p className="text-gray-500">Hipodrom</p>
                    <p className="font-medium">{horse.racecourse.name}</p>
                  </div>
                )}
                {horse.trainer && (
                  <div>
                    <p className="text-gray-500">Antrenör</p>
                    <p className="font-medium">{horse.trainer.fullName}</p>
                  </div>
                )}
                {horse.groomName && (
                  <div>
                    <p className="text-gray-500">Seyis</p>
                    <p className="font-medium">{horse.groomName}</p>
                  </div>
                )}
              </>
            )}
            {(horse.status === 'STALLION' || horse.status === 'MARE') && horse.farm && (
              <div>
                <p className="text-gray-500">Çiftlik</p>
                <p className="font-medium">{horse.farm.name}</p>
              </div>
            )}
          </div>
          {lastExpense && (
            <div className="border-t pt-3">
              <p className="text-sm text-gray-500">Son Gider</p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm font-medium">
                  {formatCurrency(Number(lastExpense.amount), lastExpense.currency)}
                </span>
                <span className="text-xs text-gray-500">
                  {getRelativeTime(new Date(lastExpense.date))}
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="RACING">
            {TR.horses.racing} ({filterHorses('RACING').length})
          </TabsTrigger>
          <TabsTrigger value="STALLION">
            {TR.horses.stallions} ({filterHorses('STALLION').length})
          </TabsTrigger>
          <TabsTrigger value="MARE">
            {TR.horses.mares} ({filterHorses('MARE').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="RACING" className="space-y-4 mt-6">
          {filterHorses('RACING').length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Yarışta atınız bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterHorses('RACING').map((horse) => (
                <HorseCard key={horse.id} horse={horse} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="STALLION" className="space-y-4 mt-6">
          {filterHorses('STALLION').length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aygır atınız bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterHorses('STALLION').map((horse) => (
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
      </Tabs>
    </div>
  )
}

