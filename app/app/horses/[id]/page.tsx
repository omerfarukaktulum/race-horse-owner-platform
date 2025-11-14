'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { ArrowLeft, TurkishLira, LayoutGrid, MapPin, FileText } from 'lucide-react'
import { TR } from '@/lib/constants/tr'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import Link from 'next/link'
import { AddNoteModal } from '@/app/components/modals/add-note-modal'
import { ChangeLocationModal } from '@/app/components/modals/change-location-modal'

interface LocationHistory {
  id: string
  startDate: string
  endDate: string | null
  racecourse: { id: string; name: string } | null
  farm: { id: string; name: string } | null
}

interface RaceHistory {
  id: string
  raceDate: string
  city?: string
  distance?: number
  surface?: string
  surfaceType?: string
  position?: number
  weight?: string
  jockeyName?: string
  raceNumber?: number
  raceName?: string
  raceType?: string
  trainerName?: string
  handicapPoints?: number
  prizeMoney?: string
  videoUrl?: string
  photoUrl?: string
}

interface HorseDetail {
  id: string
  name: string
  yob?: number
  status: string
  gender?: string
  racecourse?: { id: string; name: string }
  farm?: { id: string; name: string }
  trainer?: { id: string; fullName: string }
  groomName?: string
  stableLabel?: string
  externalRef?: string
  // Detailed statistics
  handicapPoints?: number
  totalEarnings?: string
  prizeMoney?: string
  ownerPremium?: string
  breederPremium?: string
  totalRaces?: number
  firstPlaces?: number
  secondPlaces?: number
  thirdPlaces?: number
  fourthPlaces?: number
  fifthPlaces?: number
  turfRaces?: number
  turfFirsts?: number
  turfEarnings?: string
  dirtRaces?: number
  dirtFirsts?: number
  dirtEarnings?: string
  syntheticRaces?: number
  syntheticFirsts?: number
  syntheticEarnings?: string
  // Pedigree
  sireName?: string
  damName?: string
  sireSire?: string
  sireDam?: string
  damSire?: string
  damDam?: string
  // Metadata
  dataFetchedAt?: string
  dataFetchError?: string
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
  notes?: Array<{
    id: string
    date: string
    note: string
    photoUrl?: string | string[]
    addedBy: {
      email: string
      role: string
    }
  }>
  locationHistory?: LocationHistory[]
  raceHistory?: RaceHistory[]
}

export default function HorseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const horseId = params?.id as string

  const [horse, setHorse] = useState<HorseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

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

      const horseData = data.horse

      // Fetch notes separately
      try {
        const notesResponse = await fetch(`/api/horses/${horseId}/notes`)
        const notesData = await notesResponse.json()
        if (notesResponse.ok && notesData.notes) {
          horseData.notes = notesData.notes
        }
      } catch (notesError) {
        console.error('Fetch notes error:', notesError)
        // Don't fail the whole page if notes fail
      }

      setHorse(horseData)
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
          <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
          </div>
          <p className="text-gray-900 font-semibold">{TR.common.loading}</p>
          <p className="text-sm text-gray-600 mt-2">At bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!horse) {
    return null
  }

  const age = horse.yob ? new Date().getFullYear() - horse.yob : null

  // Determine if horse is male or female for styling
  const isMale = horse.gender?.includes('Erkek') || horse.gender?.includes('ERKEK') || 
                 horse.gender?.includes('Aygır') || horse.gender?.includes('AYGIR')
  const isFemale = horse.gender?.includes('Dişi') || horse.gender?.includes('DİŞİ') || 
                   horse.gender?.includes('Kısrak') || horse.gender?.includes('KISRAK')

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {TR.common.back}
      </Button>

      {/* Header Card */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-4 flex-1">
              {/* Icon Badge */}
              <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <LayoutGrid className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                  {horse.name}
                </h1>
                {/* Origin Information */}
                {(horse.sireName || horse.damName) && (
                  <p className="text-sm text-gray-600 mb-3">
                    {horse.sireName && horse.damName 
                      ? `${horse.sireName} - ${horse.damName}`
                      : horse.sireName || horse.damName}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {age && (
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      isMale 
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                        : isFemale
                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {age} yaş{horse.yob ? ` (${horse.yob})` : ''}
                    </span>
                  )}
                  {horse.gender && (
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                      isMale 
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                        : isFemale
                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                        : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {isMale ? 'Erkek' : isFemale ? 'Dişi' : horse.gender}
                    </span>
                  )}
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                    horse.status === 'RACING' 
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : horse.status === 'STALLION'
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                      : horse.status === 'MARE'
                      ? 'bg-purple-100 text-purple-700 border-purple-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}>
                    {horse.status === 'RACING' && TR.horses.racing}
                    {horse.status === 'STALLION' && TR.horses.stallion}
                    {horse.status === 'MARE' && TR.horses.mare}
                    {horse.status === 'RETIRED' && TR.horses.retired}
                  </span>
                  {horse.handicapPoints !== null && horse.handicapPoints !== undefined && 
                   horse.status !== 'MARE' && 
                   !(horse.gender?.includes('Dişi') || horse.gender?.includes('DİŞİ') || 
                     horse.gender?.includes('Kısrak') || horse.gender?.includes('KISRAK')) && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                      Hand: {horse.handicapPoints}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setIsNoteModalOpen(true)}
                className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <FileText className="h-4 w-4 mr-2" />
                Not Ekle
              </Button>
              <Button 
                onClick={() => setIsLocationModalOpen(true)}
                className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Konum Değiştir
              </Button>
              <Link href={`/app/expenses/new?horseId=${horse.id}`}>
                <Button className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300">
                  <TurkishLira className="h-4 w-4 mr-2" />
                  Gider Ekle
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50 hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              At Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">{TR.horses.status}</p>
                <p className="font-semibold text-gray-900">
                  {horse.status === 'RACING' && TR.horses.racing}
                  {horse.status === 'STALLION' && TR.horses.stallion}
                  {horse.status === 'MARE' && TR.horses.mare}
                  {horse.status === 'RETIRED' && TR.horses.retired}
                </p>
              </div>
              {horse.yob && (
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">{TR.horses.age}</p>
                  <p className="font-semibold text-gray-900">{age} yaşında</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {horse.status === 'RACING' && (
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50 hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                Yarış Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {horse.racecourse && (
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">{TR.horses.racecourse}</p>
                    <p className="font-semibold text-gray-900">{horse.racecourse.name}</p>
                  </div>
                )}
                {horse.trainer && (
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">{TR.horses.trainer}</p>
                    <p className="font-semibold text-gray-900">{horse.trainer.fullName}</p>
                  </div>
                )}
                {horse.groomName && (
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">{TR.horses.groom}</p>
                    <p className="font-semibold text-gray-900">{horse.groomName}</p>
                  </div>
                )}
                {horse.stableLabel && (
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">{TR.horses.stable}</p>
                    <p className="font-semibold text-gray-900">{horse.stableLabel}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {(horse.status === 'STALLION' || horse.status === 'MARE') && horse.farm && (
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50 hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                Çiftlik Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">{TR.horses.farm}</p>
                <p className="font-semibold text-gray-900">{horse.farm.name}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              {TR.expenses.title}
            </CardTitle>
            <Link href={`/app/expenses/new?horseId=${horse.id}`}>
              <Button size="sm" className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-md hover:shadow-lg transition-all duration-300">
                <TurkishLira className="h-4 w-4 mr-2" />
                {TR.expenses.addExpense}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {horse.expenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <TurkishLira className="h-8 w-8 text-white" />
              </div>
              <p className="text-gray-600 font-medium">
                {TR.expenses.noExpenses}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {horse.expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 border-2 border-indigo-100/50 rounded-lg hover:border-indigo-200 hover:shadow-md transition-all bg-gradient-to-br from-indigo-50/60 via-indigo-50/40 to-white"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold text-gray-900">
                        {TR.expenseCategories[expense.category as keyof typeof TR.expenseCategories] ||
                          expense.customName ||
                          expense.category}
                      </p>
                    </div>
                    {expense.note && (
                      <p className="text-sm text-gray-600 mt-1">
                        {expense.note}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                      {formatDate(new Date(expense.date))} • {expense.addedBy.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">
                      {formatCurrency(Number(expense.amount), expense.currency)}
                    </p>
                  </div>
                </div>
              ))}
              {horse.expenses.length >= 10 && (
                <Link href={`/app/expenses/list?horseId=${horse.id}`}>
                  <Button variant="outline" className="w-full border-2 border-[#6366f1]/30 hover:bg-[#6366f1]/5 hover:border-[#6366f1]/50 text-[#6366f1]">
                    Tüm Giderleri Görüntüle
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              Notlar
            </CardTitle>
            <Button 
              size="sm"
              onClick={() => setIsNoteModalOpen(true)}
              className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-md hover:shadow-lg transition-all duration-300"
            >
              <FileText className="h-4 w-4 mr-2" />
              Not Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!horse.notes || horse.notes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <p className="text-gray-600 font-medium">
                Henüz not eklenmemiş
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {horse.notes.map((note) => (
                <div
                  key={note.id}
                  className="flex flex-col gap-3 p-4 border-2 border-indigo-100/50 rounded-lg hover:border-indigo-200 hover:shadow-md transition-all bg-gradient-to-br from-indigo-50/60 via-indigo-50/40 to-white"
                >
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.note}</p>
                    {note.photoUrl && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(() => {
                          const photoUrls = typeof note.photoUrl === 'string' 
                            ? (note.photoUrl.startsWith('[') ? JSON.parse(note.photoUrl) : [note.photoUrl])
                            : note.photoUrl
                          return photoUrls.map((url: string, idx: number) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Note photo ${idx + 1}`}
                              className="max-w-full h-auto rounded-lg border-2 border-gray-200 max-h-64 object-contain"
                            />
                          ))
                        })()}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2 font-medium">
                      {formatDate(new Date(note.date))} • {note.addedBy.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics & Performance */}
      {((horse.totalRaces !== undefined && horse.totalRaces > 0) || (horse.handicapPoints !== undefined && horse.handicapPoints > 0)) && (
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              İstatistikler ve Performans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {horse.handicapPoints !== undefined && horse.handicapPoints > 0 && 
               horse.status !== 'MARE' && 
               !(horse.gender?.includes('Dişi') || horse.gender?.includes('DİŞİ') || 
                 horse.gender?.includes('Kısrak') || horse.gender?.includes('KISRAK')) && (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Handikap Puanı</p>
                  <p className="text-2xl font-bold text-blue-900">{horse.handicapPoints}</p>
                </div>
              )}
              {horse.totalRaces !== undefined && horse.totalRaces > 0 && (
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <p className="text-xs font-medium text-purple-700 uppercase tracking-wide mb-1">Toplam Koşu</p>
                  <p className="text-2xl font-bold text-purple-900">{horse.totalRaces}</p>
                </div>
              )}
              {horse.totalEarnings && (
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Toplam Kazanç</p>
                  <p className="text-xl font-bold text-green-900">
                    {formatCurrency(Number(horse.totalEarnings), 'TRY')}
                  </p>
                </div>
              )}
              {horse.prizeMoney && (
                <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                  <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1">İkramiye</p>
                  <p className="text-xl font-bold text-amber-900">
                    {formatCurrency(Number(horse.prizeMoney), 'TRY')}
                  </p>
                </div>
              )}
            </div>

            {/* Position Statistics */}
            {(horse.firstPlaces !== undefined || horse.secondPlaces !== undefined || horse.thirdPlaces !== undefined) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Pozisyon İstatistikleri</h3>
                <div className="grid grid-cols-3 gap-4">
                  {horse.firstPlaces !== undefined && (
                    <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border-2 border-yellow-300 text-center">
                      <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide mb-1">1'incilik</p>
                      <p className="text-3xl font-bold text-yellow-900">{horse.firstPlaces}</p>
                    </div>
                  )}
                  {horse.secondPlaces !== undefined && (
                    <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-300 text-center">
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-1">2'ncilik</p>
                      <p className="text-3xl font-bold text-gray-900">{horse.secondPlaces}</p>
                    </div>
                  )}
                  {horse.thirdPlaces !== undefined && (
                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border-2 border-orange-300 text-center">
                      <p className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-1">3'üncülük</p>
                      <p className="text-3xl font-bold text-orange-900">{horse.thirdPlaces}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Surface Statistics */}
            {(horse.turfRaces !== undefined || horse.dirtRaces !== undefined || (horse.syntheticRaces !== undefined && horse.syntheticRaces > 0)) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Pist Bazında İstatistikler</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {horse.turfRaces !== undefined && (
                    <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border-2 border-emerald-300">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-emerald-800">Çim</p>
                        <span className="px-2 py-1 bg-emerald-200 text-emerald-800 text-xs font-medium rounded">
                          {horse.turfRaces} koşu
                        </span>
                      </div>
                      {horse.turfFirsts !== undefined && (
                        <p className="text-lg font-bold text-emerald-900 mb-1">
                          {horse.turfFirsts} birincilik
                        </p>
                      )}
                      {horse.turfEarnings && (
                        <p className="text-sm text-emerald-700 font-medium">
                          {formatCurrency(Number(horse.turfEarnings), 'TRY')}
                        </p>
                      )}
                    </div>
                  )}
                  {horse.dirtRaces !== undefined && (
                    <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border-2 border-amber-300">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-amber-800">Kum</p>
                        <span className="px-2 py-1 bg-amber-200 text-amber-800 text-xs font-medium rounded">
                          {horse.dirtRaces} koşu
                        </span>
                      </div>
                      {horse.dirtFirsts !== undefined && (
                        <p className="text-lg font-bold text-amber-900 mb-1">
                          {horse.dirtFirsts} birincilik
                        </p>
                      )}
                      {horse.dirtEarnings && (
                        <p className="text-sm text-amber-700 font-medium">
                          {formatCurrency(Number(horse.dirtEarnings), 'TRY')}
                        </p>
                      )}
                    </div>
                  )}
                  {horse.syntheticRaces !== undefined && horse.syntheticRaces > 0 && (
                    <div className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border-2 border-indigo-300">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-indigo-800">Sentetik</p>
                        <span className="px-2 py-1 bg-indigo-200 text-indigo-800 text-xs font-medium rounded">
                          {horse.syntheticRaces} koşu
                        </span>
                      </div>
                      {horse.syntheticFirsts !== undefined && (
                        <p className="text-lg font-bold text-indigo-900 mb-1">
                          {horse.syntheticFirsts} birincilik
                        </p>
                      )}
                      {horse.syntheticEarnings && (
                        <p className="text-sm text-indigo-700 font-medium">
                          {formatCurrency(Number(horse.syntheticEarnings), 'TRY')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Financial Info */}
            {(horse.ownerPremium || horse.breederPremium) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Ek Gelirler</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {horse.ownerPremium && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">At Sahibi Primi</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(Number(horse.ownerPremium), 'TRY')}
                      </p>
                    </div>
                  )}
                  {horse.breederPremium && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Yetiştiricilik Primi</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(Number(horse.breederPremium), 'TRY')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pedigree */}
      {(horse.sireName || horse.damName) && (
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              Pedigri (Soy Ağacı)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Sire Line */}
              {horse.sireName && (
                <div className="p-4 bg-gradient-to-br from-indigo-50/60 via-indigo-50/40 to-white rounded-lg border-2 border-indigo-100/50">
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">Baba (Sire)</p>
                  <p className="text-lg font-bold text-indigo-900 mb-3">{horse.sireName}</p>
                  {(horse.sireSire || horse.sireDam) && (
                    <div className="ml-4 space-y-2 border-l-2 border-indigo-300 pl-4">
                      {horse.sireSire && (
                        <div>
                          <p className="text-xs text-indigo-600 font-medium mb-1">Baba'nın Babası</p>
                          <p className="text-sm font-semibold text-indigo-800">{horse.sireSire}</p>
                        </div>
                      )}
                      {horse.sireDam && (
                        <div>
                          <p className="text-xs text-indigo-600 font-medium mb-1">Baba'nın Annesi</p>
                          <p className="text-sm font-semibold text-indigo-800">{horse.sireDam}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Dam Line */}
              {horse.damName && (
                <div className="p-4 bg-gradient-to-br from-purple-50/60 via-purple-50/40 to-white rounded-lg border-2 border-purple-100/50">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Anne (Dam)</p>
                  <p className="text-lg font-bold text-purple-900 mb-3">{horse.damName}</p>
                  {(horse.damSire || horse.damDam) && (
                    <div className="ml-4 space-y-2 border-l-2 border-purple-300 pl-4">
                      {horse.damSire && (
                        <div>
                          <p className="text-xs text-purple-600 font-medium mb-1">Anne'nin Babası</p>
                          <p className="text-sm font-semibold text-purple-800">{horse.damSire}</p>
                        </div>
                      )}
                      {horse.damDam && (
                        <div>
                          <p className="text-xs text-purple-600 font-medium mb-1">Anne'nin Annesi</p>
                          <p className="text-sm font-semibold text-purple-800">{horse.damDam}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Race History */}
      {horse.raceHistory && horse.raceHistory.length > 0 && (
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                  Koşu Geçmişi
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {horse.raceHistory.length} koşu
                  {horse.raceHistory.length > 0 && (() => {
                    const lastRaceDate = new Date(horse.raceHistory[0].raceDate)
                    const today = new Date()
                    const diffTime = Math.abs(today.getTime() - lastRaceDate.getTime())
                    const daysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                    return daysAgo > 0 ? ` • Son koşu ${daysAgo} gün önce` : ''
                  })()}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Tarih</th>
                    <th className="hidden sm:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Şehir</th>
                    <th className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Koşu Tipi</th>
                    <th className="hidden md:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Mesafe</th>
                    <th className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap text-center">P</th>
                    <th className="hidden lg:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Pist</th>
                    <th className="hidden md:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Jokey</th>
                    <th className="hidden lg:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Ağırlık</th>
                    <th className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">HP</th>
                    <th className="hidden lg:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">İkramiye</th>
                    <th className="hidden xl:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Antrenör</th>
                  </tr>
                </thead>
                <tbody>
                  {horse.raceHistory.map((race, index) => {
                    const position = race.position
                    const positionColor = position === 1 
                      ? 'bg-yellow-500' 
                      : position === 2 
                      ? 'bg-gray-400' 
                      : position === 3
                      ? 'bg-orange-600'
                      : 'bg-orange-500'
                    
                    return (
                      <tr 
                        key={race.id} 
                        className={`hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          <span className="hidden sm:inline">
                            {formatDate(new Date(race.raceDate))}
                          </span>
                          <div className="sm:hidden">
                            <div className="font-medium">
                              {new Date(race.raceDate).toLocaleDateString('tr-TR', { 
                                day: '2-digit', 
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </div>
                            {race.city && (
                              <div className="text-gray-600 text-xs">{race.city}</div>
                            )}
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          {race.city || '-'}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900">
                          <span className="hidden sm:inline">
                            {race.raceType || race.raceName || '-'}
                          </span>
                          <div className="sm:hidden">
                            <div className="font-medium">
                              {race.raceType || race.raceName || '-'}
                            </div>
                            {race.distance && (
                              <div className="text-gray-600 text-xs">{race.distance}m</div>
                            )}
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          {race.distance ? `${race.distance}m` : '-'}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-center">
                          {position !== undefined ? (
                            <div className="flex flex-col items-center">
                              <span 
                                className={`text-white px-2 py-0.5 rounded text-xs font-semibold ${positionColor}`}
                              >
                                {position}
                              </span>
                              {race.surface && (
                                <div className="text-gray-600 text-xs mt-0.5 hidden sm:block">
                                  {race.surface}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="hidden lg:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          {race.surface || '-'}
                        </td>
                        <td className="hidden md:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          {race.jockeyName || '-'}
                        </td>
                        <td className="hidden lg:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          {race.weight ? `${race.weight}kg` : '-'}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-center">
                          {race.handicapPoints !== undefined ? (
                            <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs sm:text-sm font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                              {race.handicapPoints}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="hidden lg:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          {race.prizeMoney ? (
                            <span className="text-green-600 font-medium">
                              {formatCurrency(Number(race.prizeMoney), 'TRY')}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="hidden xl:table-cell px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          {race.trainerName || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Action Links */}
            {horse.raceHistory.some(r => r.videoUrl || r.photoUrl) && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-wrap gap-2 text-xs">
                  {horse.raceHistory.map((race) => (
                    <div key={race.id} className="flex items-center gap-1">
                      {race.videoUrl && (
                        <a
                          href={race.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#6366f1] hover:text-[#4f46e5] hover:underline font-medium"
                        >
                          Video ({formatDate(new Date(race.raceDate))})
                        </a>
                      )}
                      {race.photoUrl && (
                        <a
                          href={race.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#6366f1] hover:text-[#4f46e5] hover:underline ml-2 font-medium"
                        >
                          Foto ({formatDate(new Date(race.raceDate))})
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Location History */}
      {horse.locationHistory && horse.locationHistory.length > 0 && (
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              Konum Geçmişi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {horse.locationHistory.map((location, index) => {
                const startDate = new Date(location.startDate)
                const endDate = location.endDate ? new Date(location.endDate) : new Date()
                const durationDays = Math.floor(
                  (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                )
                const durationMonths = Math.floor(durationDays / 30)
                const durationYears = Math.floor(durationDays / 365)

                let durationText = ''
                if (durationYears > 0) {
                  durationText = `${durationYears} yıl`
                  if (durationMonths % 12 > 0) {
                    durationText += ` ${durationMonths % 12} ay`
                  }
                } else if (durationMonths > 0) {
                  durationText = `${durationMonths} ay`
                  if (durationDays % 30 > 0) {
                    durationText += ` ${durationDays % 30} gün`
                  }
                } else {
                  durationText = `${durationDays} gün`
                }

                const locationName = location.racecourse
                  ? location.racecourse.name
                  : location.farm
                  ? location.farm.name
                  : 'Bilinmiyor'

                return (
                  <div
                    key={location.id}
                    className="flex items-start justify-between p-4 border-2 border-indigo-100/50 rounded-lg hover:border-indigo-200 hover:shadow-md transition-all bg-gradient-to-br from-indigo-50/60 via-indigo-50/40 to-white"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-2">
                        <p className="font-semibold text-gray-900">{locationName}</p>
                        {location.racecourse && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                            Hipodrom
                          </span>
                        )}
                        {location.farm && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                            Çiftlik
                          </span>
                        )}
                        {!location.endDate && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            Mevcut
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {formatDate(startDate)} -{' '}
                        {location.endDate ? formatDate(endDate) : 'Devam ediyor'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        Süre: {durationText}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {horse && (
        <>
          <AddNoteModal
            open={isNoteModalOpen}
            onClose={() => setIsNoteModalOpen(false)}
            horseId={horse.id}
            horseName={horse.name}
            onSuccess={() => {
              fetchHorse()
            }}
          />
          <ChangeLocationModal
            open={isLocationModalOpen}
            onClose={() => setIsLocationModalOpen(false)}
            horseId={horse.id}
            horseName={horse.name}
            currentLocationType={horse.racecourse ? 'racecourse' : horse.farm ? 'farm' : undefined}
            currentCity={horse.racecourse?.name || horse.farm?.name}
            currentRacecourseId={horse.racecourse?.id}
            currentFarmId={horse.farm?.id}
            onSuccess={() => {
              fetchHorse()
            }}
          />
        </>
      )}
    </div>
  )
}

