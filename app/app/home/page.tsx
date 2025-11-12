'use client'

import { useAuth } from '@/lib/context/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import Link from 'next/link'
import { Activity, DollarSign, TrendingUp, Plus } from 'lucide-react'
import { TR } from '@/lib/constants/tr'

export default function HomePage() {
  const { user, isOwner, isTrainer } = useAuth()

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/app/horses">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <Activity className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>{TR.nav.horses}</CardTitle>
              <CardDescription>
                Atlarınızı görüntüleyin ve yönetin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                Atlara Git
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/app/expenses/new">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <DollarSign className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>{TR.expenses.addExpense}</CardTitle>
              <CardDescription>
                Yeni gider ekleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Gider Ekle
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/app/stats/horses">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>{TR.nav.statistics}</CardTitle>
              <CardDescription>
                İstatistikleri görüntüleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                İstatistiklere Git
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Hızlı İşlemler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/app/horses">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Yeni At Ekle
              </Button>
            </Link>
            <Link href="/app/expenses/list">
              <Button variant="outline" className="w-full justify-start">
                Tüm Giderleri Görüntüle
              </Button>
            </Link>
            <Link href="/app/stablemate">
              <Button variant="outline" className="w-full justify-start">
                Eküri Ayarları
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

