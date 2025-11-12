'use client'

import { useAuth } from '@/lib/context/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import Link from 'next/link'
import { Activity, DollarSign, TrendingUp, Plus, Settings } from 'lucide-react'
import { TR } from '@/lib/constants/tr'

export default function HomePage() {
  const { user, isOwner, isTrainer } = useAuth()

  return (
    <div className="space-y-8">
      {/* Main Action Cards - Matching driving-license practice page style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <Link href="/app/horses">
          <Card className="p-4 sm:p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-white shadow-lg border border-blue-100 cursor-pointer">
            <div className="flex-1 min-w-0 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                {TR.nav.horses}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">
                Atlarınızı görüntüleyin ve yönetin
              </p>
            </div>

            {/* Centered Icon */}
            <div className="flex justify-center my-4 sm:my-6">
              <Activity className="h-12 w-12 text-[#6366f1]" />
            </div>

            <Button className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] shadow-lg hover:shadow-xl text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg w-full transition-all duration-300 text-sm sm:text-base">
              Atlara Git
            </Button>
          </Card>
        </Link>

        <Link href="/app/expenses">
          <Card className="p-4 sm:p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 bg-gradient-to-br from-emerald-50 via-green-50 to-white shadow-lg border border-emerald-100 cursor-pointer">
            <div className="flex-1 min-w-0 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                {TR.nav.expenses}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">
                Giderleri görüntüleyin ve yönetin
              </p>
            </div>

            {/* Centered Icon */}
            <div className="flex justify-center my-4 sm:my-6">
              <DollarSign className="h-12 w-12 text-emerald-600" />
            </div>

            <Button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:shadow-xl text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg w-full transition-all duration-300 text-sm sm:text-base">
              Giderlere Git
            </Button>
          </Card>
        </Link>

        <Link href="/app/stats">
          <Card className="p-4 sm:p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 via-pink-50 to-white shadow-lg border border-purple-100 cursor-pointer">
            <div className="flex-1 min-w-0 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                {TR.nav.statistics}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">
                İstatistikleri görüntüleyin
              </p>
            </div>

            {/* Centered Icon */}
            <div className="flex justify-center my-4 sm:my-6">
              <TrendingUp className="h-12 w-12 text-purple-600" />
            </div>

            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg w-full transition-all duration-300 text-sm sm:text-base">
              İstatistiklere Git
            </Button>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      {isOwner && (
        <>
          <div className="pt-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Hızlı İşlemler</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            <Link href="/app/horses">
              <Card className="p-4 sm:p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-white shadow-lg border border-blue-100 cursor-pointer">
                <div className="flex-1 min-w-0 mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                    Yeni At Ekle
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">
                    Yeni at kaydı oluştur
                  </p>
                </div>

                {/* Centered Icon */}
                <div className="flex justify-center my-4 sm:my-6">
                  <Plus className="h-12 w-12 text-[#6366f1]" />
                </div>

                <Button className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] shadow-lg hover:shadow-xl text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg w-full transition-all duration-300 text-sm sm:text-base">
                  At Ekle
                </Button>
              </Card>
            </Link>
            
            <Link href="/app/expenses">
              <Card className="p-4 sm:p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 bg-gradient-to-br from-emerald-50 via-green-50 to-white shadow-lg border border-emerald-100 cursor-pointer">
                <div className="flex-1 min-w-0 mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                    Tüm Giderler
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">
                    Gider geçmişini görüntüle
                  </p>
                </div>

                {/* Centered Icon */}
                <div className="flex justify-center my-4 sm:my-6">
                  <DollarSign className="h-12 w-12 text-emerald-600" />
                </div>

                <Button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:shadow-xl text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg w-full transition-all duration-300 text-sm sm:text-base">
                  Giderleri Gör
                </Button>
              </Card>
            </Link>
            
            <Link href="/app/stablemate">
              <Card className="p-4 sm:p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 bg-gradient-to-br from-amber-50 via-orange-50 to-white shadow-lg border border-amber-100 cursor-pointer">
                <div className="flex-1 min-w-0 mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                    Eküri Ayarları
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">
                    Eküri bilgilerini düzenle
                  </p>
                </div>

                {/* Centered Icon */}
                <div className="flex justify-center my-4 sm:my-6">
                  <Settings className="h-12 w-12 text-amber-600" />
                </div>

                <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg hover:shadow-xl text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg w-full transition-all duration-300 text-sm sm:text-base">
                  Ayarlar
                </Button>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

