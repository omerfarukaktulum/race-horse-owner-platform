'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { User, Bell, Building2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

interface TrainerAccountData {
  trainer: {
    id: string
    fullName: string
    email: string
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
    ownerOfficialRef?: string | null
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
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

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
      title: 'Deklareler',
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
      // Map the key to the API format
      const apiKeyMap: Record<string, string> = {
        notifyHorseRegistered: 'horseRegistered',
        notifyHorseDeclared: 'horseDeclared',
        notifyNewTraining: 'newTraining',
        notifyNewExpense: 'newExpense',
        notifyNewNote: 'newNote',
        notifyNewRace: 'newRace',
      }
      
      const response = await fetch('/api/trainer/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKeyMap[key], value: nextValue }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Bildirim ayarı güncellenemedi')
      }
      // Update with the response data to ensure consistency
      if (data.notificationSettings) {
        const mappedSettings = {
          notifyHorseRegistered: data.notificationSettings.horseRegistered,
          notifyHorseDeclared: data.notificationSettings.horseDeclared,
          notifyNewTraining: data.notificationSettings.newTraining,
          notifyNewExpense: data.notificationSettings.newExpense,
          notifyNewNote: data.notificationSettings.newNote,
          notifyNewRace: data.notificationSettings.newRace,
        }
        setNotificationSettings(mappedSettings)
      }
      toast.success('Bildirim ayarı güncellendi')
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

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError(null)

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Lütfen yeni şifreyi doldurun')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Şifreler eşleşmiyor')
      return
    }

    setIsUpdatingPassword(true)
    try {
      const response = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordForm.newPassword }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Şifre güncellenemedi')
      }
      toast.success('Şifreniz güncellendi')
      setPasswordForm({ newPassword: '', confirmPassword: '' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Şifre güncellenemedi'
      setPasswordError(message)
      toast.error(message)
    } finally {
      setIsUpdatingPassword(false)
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

  const summaryCards = [
    { label: 'Eküri Sayısı', value: accountData.stablemates.length.toString() },
    { label: 'At Sayısı', value: totalHorses.toString() },
  ]

  return (
    <div className="space-y-8 pb-10">
      {/* Trainer Profile - Standalone */}
        <Card className="bg-white/95 border border-indigo-100 shadow-lg w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600">
                <User className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Antrenör Profili</CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  {accountData.trainer.fullName}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {summaryCards.map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-md border border-gray-100 bg-white px-3 py-2 shadow-sm inline-flex flex-col"
                  >
                    <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              {accountData.trainer.phone && (
                <div className="rounded-md border border-gray-100 bg-white px-3 py-2 shadow-sm inline-flex flex-col">
                  <p className="text-xs uppercase tracking-wider text-gray-500">Telefon</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{accountData.trainer.phone}</p>
                </div>
              )}
              {accountData.stablemates.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {accountData.stablemates.map((stablemate) => (
                    <div
                      key={stablemate.id}
                      className="rounded-md border border-gray-100 bg-white px-3 py-2 shadow-sm flex items-center gap-3"
                    >
                      {stablemate.ownerOfficialRef ? (
                        <div className="w-10 h-10 rounded-xl border border-gray-200 overflow-hidden flex-shrink-0 bg-white">
                          <img
                            src={`https://medya-cdn.tjk.org/formaftp/${stablemate.ownerOfficialRef}.jpg`}
                            alt={`${stablemate.name} forması`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon')
                              if (fallback instanceof HTMLElement) {
                                fallback.style.display = 'flex'
                              }
                            }}
                          />
                          <div className="fallback-icon hidden w-full h-full items-center justify-center">
                            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
                              <Building2 className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600 flex-shrink-0">
                          <Building2 className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wider text-gray-500 truncate">{stablemate.name}</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{stablemate.totalHorses}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      {/* Second Row: Notification Settings + Account Security */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Notification Settings */}
        <Card className="w-full bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Bildirim Ayarları</CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  E-posta bildirimlerinizi yönetin
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notificationOptions.map((item) => {
                const enabled = notificationSettings[item.key]
                const isSaving = savingNotificationKey === item.key
                return (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm flex items-center gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      onClick={() => handleNotificationToggle(item.key)}
                      disabled={isSaving}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
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
          </CardContent>
        </Card>

          {/* Account Security */}
          <Card className="w-full bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Hesap Güvenliği</CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Şifre ve oturum ayarlarınızı yönetin
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handlePasswordUpdate}>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">E-posta Adresi</Label>
                  <Input value={accountData.trainer.email} disabled className="bg-gray-50 border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Yeni Şifre</Label>
                  <Input
                    type="password"
                    placeholder="********"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Yeni Şifre (Tekrar)</Label>
                  <Input
                    type="password"
                    placeholder="********"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
                {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca]"
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                </Button>
              </form>
          </CardContent>
        </Card>
      </div>

      {/* Stablemates and Horses */}
      <Card className="w-full bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Eküriler ve Atlar</CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Sorumlu olduğunuz eküriler ve onlara ait atlar
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {accountData.stablemates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-6 text-center text-sm text-gray-600">
              Henüz atanmış olduğunuz bir eküri bulunmuyor.
            </div>
          ) : (
            <div className="space-y-4">
              {accountData.stablemates.map((stablemate) => (
                <div key={stablemate.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {stablemate.ownerOfficialRef ? (
                        <div className="w-12 h-12 rounded-2xl border border-gray-200 overflow-hidden flex-shrink-0 bg-white">
                          <img
                            src={`https://medya-cdn.tjk.org/formaftp/${stablemate.ownerOfficialRef}.jpg`}
                            alt={`${stablemate.name} forması`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon')
                              if (fallback instanceof HTMLElement) {
                                fallback.style.display = 'flex'
                              }
                            }}
                          />
                          <div className="fallback-icon hidden w-full h-full items-center justify-center">
                            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600">
                              <Building2 className="h-5 w-5" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600 flex-shrink-0">
                          <Building2 className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{stablemate.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {stablemate.ownerName}
                          {stablemate.location ? ` • ${stablemate.location}` : ''}
                          {stablemate.ownerEmail ? ` • ${stablemate.ownerEmail}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                      {stablemate.totalHorses} At
                    </span>
                  </div>
                  {stablemate.horses.length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {stablemate.horses.map((horse) => (
                        <div
                          key={horse.id}
                          className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm"
                        >
                          <p className="text-sm font-semibold text-gray-900">{horse.name}</p>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                            {horse.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Bu eküri için henüz sorumlu olduğunuz at bulunmuyor.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

