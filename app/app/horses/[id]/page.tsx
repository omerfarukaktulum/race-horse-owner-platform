'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { ArrowLeft, Edit, Trash2, DollarSign } from 'lucide-react'
import { TR } from '@/lib/constants/tr'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import Link from 'next/link'

interface HorseDetail {
  id: string
  name: string
  yob?: number
  status: string
  racecourse?: { id: string; name: string }
  farm?: { id: string; name: string }
  trainer?: { id: string; fullName: string }
  groomName?: string
  stableLabel?: string
  expenses: Array<{
    id: string
    date: string
    category: string
    customName?: string
    amount: number
    currency: string
    note?: string
    addedBy: {
      email: string
      role: string
    }
  }>
}

export default function HorseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const horseId = params?.id as string

  const [horse, setHorse] = useState<HorseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (horseId) {
      fetchHorse()
    }
  }, [horseId])

  const fetchHorse = async () => {
    try {
      const response = await fetch(`/api/horses/${horseId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'At yüklenemedi')
      }

      setHorse(data.horse)
    } catch (error) {
      console.error('Fetch horse error:', error)
      toast.error('At yüklenirken bir hata oluştu')
      router.push('/app/horses')
    } finally {
      setIsLoading(false)
    }
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

  if (!horse) {
    return null
  }

  const age = horse.yob ? new Date().getFullYear() - horse.yob : null

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {TR.common.back}
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{horse.name}</h1>
          <p className="text-gray-600 mt-2">
            {age && `${age} yaşında`}
            {horse.yob && ` • Doğum Yılı: ${horse.yob}`}
            {' • '}
            {horse.status === 'RACING' && TR.horses.racing}
            {horse.status === 'STALLION' && TR.horses.stallion}
            {horse.status === 'MARE' && TR.horses.mare}
            {horse.status === 'RETIRED' && TR.horses.retired}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href={`/app/expenses/new?horseId=${horse.id}`}>
            <Button>
              <DollarSign className="h-4 w-4 mr-2" />
              Gider Ekle
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>At Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{TR.horses.status}</p>
                <p className="font-medium">
                  {horse.status === 'RACING' && TR.horses.racing}
                  {horse.status === 'STALLION' && TR.horses.stallion}
                  {horse.status === 'MARE' && TR.horses.mare}
                  {horse.status === 'RETIRED' && TR.horses.retired}
                </p>
              </div>
              {horse.yob && (
                <div>
                  <p className="text-sm text-gray-500">{TR.horses.age}</p>
                  <p className="font-medium">{age} yaşında</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {horse.status === 'RACING' && (
          <Card>
            <CardHeader>
              <CardTitle>Yarış Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                {horse.racecourse && (
                  <div>
                    <p className="text-sm text-gray-500">{TR.horses.racecourse}</p>
                    <p className="font-medium">{horse.racecourse.name}</p>
                  </div>
                )}
                {horse.trainer && (
                  <div>
                    <p className="text-sm text-gray-500">{TR.horses.trainer}</p>
                    <p className="font-medium">{horse.trainer.fullName}</p>
                  </div>
                )}
                {horse.groomName && (
                  <div>
                    <p className="text-sm text-gray-500">{TR.horses.groom}</p>
                    <p className="font-medium">{horse.groomName}</p>
                  </div>
                )}
                {horse.stableLabel && (
                  <div>
                    <p className="text-sm text-gray-500">{TR.horses.stable}</p>
                    <p className="font-medium">{horse.stableLabel}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {(horse.status === 'STALLION' || horse.status === 'MARE') && horse.farm && (
          <Card>
            <CardHeader>
              <CardTitle>Çiftlik Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-sm text-gray-500">{TR.horses.farm}</p>
                <p className="font-medium">{horse.farm.name}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{TR.expenses.title}</CardTitle>
            <Link href={`/app/expenses/new?horseId=${horse.id}`}>
              <Button size="sm" variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                {TR.expenses.addExpense}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {horse.expenses.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {TR.expenses.noExpenses}
            </p>
          ) : (
            <div className="space-y-3">
              {horse.expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">
                        {TR.expenseCategories[expense.category as keyof typeof TR.expenseCategories] ||
                          expense.customName ||
                          expense.category}
                      </p>
                    </div>
                    {expense.note && (
                      <p className="text-sm text-gray-500 mt-1">
                        {expense.note}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(new Date(expense.date))} • {expense.addedBy.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {formatCurrency(Number(expense.amount), expense.currency)}
                    </p>
                  </div>
                </div>
              ))}
              {horse.expenses.length >= 10 && (
                <Link href={`/app/expenses/list?horseId=${horse.id}`}>
                  <Button variant="outline" className="w-full">
                    Tüm Giderleri Görüntüle
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

