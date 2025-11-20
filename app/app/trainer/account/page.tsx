'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Users, Activity, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'

interface TrainerAccountData {
  trainer: {
    id: string
    fullName: string
    phone?: string | null
    tjkTrainerId?: string | null
    notifyHorseRegistered: boolean
    notifyHorseDeclared: boolean
    notifyNewTraining: boolean
    notifyNewExpense: boolean
    notifyNewNote: boolean
    notifyNewRace: boolean
  }
  stablemates: Array<{
    id: string
    name: string
    location?: string | null
    ownerName: string
    ownerEmail?: string | null
    totalHorses: number
    horses: Array<{
      id: string
      name: string
      status: string
    }>
  }>
}

export default function TrainerAccountPage() {
  const [accountData, setAccountData] = useState<TrainerAccountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notificationSettings, setNotificationSettings] = useState({
    notifyHorseRegistered: true,
    notifyHorseDeclared: true,
    notifyNewTraining: true,
    notifyNewExpense: true,
    notifyNewNote: true,
    notifyNewRace: true,
  })
  const [savingNotificationKey, setSavingNotificationKey] = useState<string | null>(null)

  const fetchAccountData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/trainer/account', { credentials: 'include' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Bilgiler yüklenemedi')
      }
      setAccountData(data)
      setNotificationSettings({
        notifyHorseRegistered: data.trainer.notifyHorseRegistered,
        notifyHorseDeclared: data.trainer.notifyHorseDeclared,
        notifyNewTraining: data.trainer.notifyNewTraining,
        notifyNewExpense: data.trainer.notifyNewExpense,
        notifyNewNote: data.trainer.notifyNewNote,
        notifyNewRace: data.trainer.notifyNewRace,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bilgiler yüklenemedi'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccountData()
  }, [])

  const notificationOptions: Array<{
    key: keyof typeof notificationSettings
    title: string
    description: string
  }> = [
    {
      key: 'notifyHorseRegistered',
      title: 'Kayıtlar',
      description: 'Atlarınız yarışa kaydedildiğinde bilgi alın.',
    },
    {
      key: 'notifyHorseDeclared',
      title: 'Deklarasyonlar',
      description: 'Deklarasyon açıklandığında haberdar olun.',
    },
    {
      key: 'notifyNewTraining',
      title: 'İdmanlar',
      description: 'Yeni idman verileri geldiğinde bildir.',
    },
    {
      key: 'notifyNewExpense',
      title: 'Giderler',
      description: 'Takip ettiğiniz atlara gider eklendiğinde bilgilendir.',
    },
    {
      key: 'notifyNewNote',
      title: 'Notlar',
      description: 'Sahip notları paylaşıldığında haber ver.',
    },
    {
      key: 'notifyNewRace',
      title: 'Yarış Sonuçları',
      description: 'Atlarınız yarış tamamladığında sonuçları gönder.',
    },
  ]

  const handleNotificationToggle = async (key: keyof typeof notificationSettings) => {
    const nextValue = !notificationSettings[key]
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: nextValue,
    }))
    setSavingNotificationKey(key)
    try {
      const response = await fetch('/api/trainer/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: nextValue }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Bildirim ayarı güncellenemedi')
      }
    } catch (error) {
      setNotificationSettings((prev) => ({
        ...prev,
        [key]: !nextValue,
      }))
      const message = error instanceof Error ? error.message : 'Bildirim ayarı güncellenemedi'
      toast.error(message)
    } finally {
      setSavingNotificationKey(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Hesap bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!accountData) {
    return (
      <div className="text-center space-y-4 py-20">
        <p className="text-gray-500">Hesap bilgileri yüklenemedi.</p>
        <Button onClick={fetchAccountData} className="bg-indigo-600 text-white">
          Tekrar Dene
        </Button>
      </div>
    )
  }

  const totalHorses = accountData.stablemates.reduce((sum, stablemate) => sum + stablemate.totalHorses, 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Antrenör Hesabı</h1>
          <p className="text-gray-500 mt-1">
            {accountData.trainer.fullName}{' '}
            {accountData.trainer.tjkTrainerId && (
              <span className="text-sm text-gray-400">• TJK ID: {accountData.trainer.tjkTrainerId}</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          className="flex items-center gap-2 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          onClick={fetchAccountData}
        >
          <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white/90 border border-indigo-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Çalıştığım Eküriler</CardTitle>
            <Users className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{accountData.stablemates.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/90 border border-indigo-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Sorumlu Olduğum Atlar</CardTitle>
            <Activity className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{totalHorses}</p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Bildirim Tercihleri</h2>
          <p className="text-sm text-gray-500">Size gelen e-posta bildirimlerini buradan yönetebilirsiniz.</p>
        </div>
        <div className="space-y-3">
          {notificationOptions.map((item) => {
            const enabled = notificationSettings[item.key]
            const isSaving = savingNotificationKey === item.key
            return (
              <div
                key={item.key}
                className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => handleNotificationToggle(item.key)}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                    enabled ? 'bg-gradient-to-r from-[#6366f1] to-[#4f46e5]' : 'bg-gray-200'
                  } ${isSaving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Eküriler ve Atlar</h2>
          <p className="text-sm text-gray-500">
            Sorumlu olduğunuz eküriler ve onlara ait atlar burada listelenir.
          </p>
        </div>

        {accountData.stablemates.length === 0 ? (
          <Card className="border-dashed border-2 border-indigo-200 bg-indigo-50/50">
            <CardContent className="py-10 text-center text-gray-600">
              Henüz atanmış olduğunuz bir eküri bulunmuyor.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {accountData.stablemates.map((stablemate) => (
              <Card key={stablemate.id} className="border border-gray-100 shadow-sm">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg text-gray-900">{stablemate.name}</CardTitle>
                      <CardDescription className="text-sm text-gray-500">
                        {stablemate.ownerName}
                        {stablemate.location ? ` • ${stablemate.location}` : ''}
                        {stablemate.ownerEmail ? ` • ${stablemate.ownerEmail}` : ''}
                      </CardDescription>
                    </div>
                    <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                      {stablemate.totalHorses} At
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {stablemate.horses.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {stablemate.horses.map((horse) => (
                        <div
                          key={horse.id}
                          className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
                        >
                          <p className="text-base font-semibold text-gray-900">{horse.name}</p>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                            {horse.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Bu eküri için henüz sorumlu olduğunuz at bulunmuyor.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

