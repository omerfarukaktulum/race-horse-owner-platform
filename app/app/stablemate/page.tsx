'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog'
import { Checkbox } from '@/app/components/ui/checkbox'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'
import { Building2, Calendar, MapPin, Globe, Users, Activity, TrendingUp, Clock, Settings, Bell } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

const RACECOURSE_CITIES = [
  'İstanbul',
  'Ankara',
  'İzmir',
  'Bursa',
  'Şanlıurfa',
  'Diyarbakır',
  'Kocaeli',
  'Adana',
  'Elazığ',
  'Antalya',
  'Gaziantep',
  'Konya',
  'Samsun',
]

const OTHER_CITIES = [
  'Adıyaman',
  'Afyonkarahisar',
  'Ağrı',
  'Amasya',
  'Artvin',
  'Aydın',
  'Balıkesir',
  'Bilecik',
  'Bingöl',
  'Bitlis',
  'Bolu',
  'Burdur',
  'Çanakkale',
  'Çankırı',
  'Çorum',
  'Denizli',
  'Edirne',
  'Erzincan',
  'Erzurum',
  'Eskişehir',
  'Giresun',
  'Gümüşhane',
  'Hakkari',
  'Hatay',
  'Isparta',
  'İçel',
  'Kars',
  'Kastamonu',
  'Kayseri',
  'Kırklareli',
  'Kırşehir',
  'Kütahya',
  'Malatya',
  'Manisa',
  'Kahramanmaraş',
  'Mardin',
  'Muğla',
  'Muş',
  'Nevşehir',
  'Niğde',
  'Ordu',
  'Rize',
  'Sakarya',
  'Siirt',
  'Sinop',
  'Sivas',
  'Tekirdağ',
  'Tokat',
  'Trabzon',
  'Tunceli',
  'Uşak',
  'Van',
  'Yozgat',
  'Zonguldak',
  'Aksaray',
  'Bayburt',
  'Karaman',
  'Kırıkkale',
  'Batman',
  'Şırnak',
  'Bartın',
  'Ardahan',
  'Iğdır',
  'Yalova',
  'Karabük',
  'Kilis',
  'Osmaniye',
  'Düzce',
]

const ALL_CITIES = [...RACECOURSE_CITIES, ...OTHER_CITIES]

interface StablemateData {
  id: string
  name: string
  foundationYear?: number
  coOwners: string[]
  location?: string
  website?: string
  createdAt: string
  updatedAt: string
  horses?: Array<{
    id: string
    name: string
    status: string
    yob?: number
  }>
}

export default function StablematePage() {
  const [stablemate, setStablemate] = useState<StablemateData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [foundationYear, setFoundationYear] = useState('')
  const [coOwners, setCoOwners] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    horseRegistered: true,
    horseDeclared: true,
    newTraining: true,
    newExpense: true,
    newNote: true,
    newRace: true,
  })
  const [isSavingNotifications, setIsSavingNotifications] = useState(false)

  useEffect(() => {
    fetchStablemate()
  }, [])

  const fetchStablemate = async () => {
    try {
      const response = await fetch('/api/onboarding/stablemate')
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Eküri bulunamadı')
          return
        }
        throw new Error(data.error || 'Eküri yüklenemedi')
      }

      // Also fetch horses for statistics
      const horsesResponse = await fetch('/api/horses')
      const horsesData = await horsesResponse.ok ? await horsesResponse.json() : { horses: [] }

      setStablemate({
        ...data.stablemate,
        horses: horsesData.horses || [],
      })
      // Set form values
      setName(data.stablemate.name)
      setFoundationYear(data.stablemate.foundationYear?.toString() || '')
      setCoOwners(data.stablemate.coOwners?.join('\n') || '')
      setLocation(data.stablemate.location || '')
      setWebsite(data.stablemate.website || '')
    } catch (error) {
      console.error('Fetch stablemate error:', error)
      toast.error('Eküri yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Eküri adı gerekli')
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/onboarding/stablemate', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          foundationYear: foundationYear ? parseInt(foundationYear) : undefined,
          coOwners: coOwners ? coOwners.split('\n').filter(Boolean) : [],
          location: location || undefined,
          website: website || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Güncelleme başarısız')
      }

      toast.success('Eküri başarıyla güncellendi')
      setStablemate(data.stablemate)
      setIsEditing(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form to original values
    if (stablemate) {
      setName(stablemate.name)
      setFoundationYear(stablemate.foundationYear?.toString() || '')
      setCoOwners(stablemate.coOwners?.join('\n') || '')
      setLocation(stablemate.location || '')
      setWebsite(stablemate.website || '')
    }
    setIsEditing(false)
  }

  const handleNotificationToggle = async (key: keyof typeof notificationSettings) => {
    const newSettings = {
      ...notificationSettings,
      [key]: !notificationSettings[key],
    }
    setNotificationSettings(newSettings)
    
    setIsSavingNotifications(true)
    try {
      // TODO: Implement API endpoint to save notification settings
      // const response = await fetch('/api/notifications/settings', {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   credentials: 'include',
      //   body: JSON.stringify(newSettings),
      // })
      // if (!response.ok) throw new Error('Ayarlar kaydedilemedi')
      // toast.success('Bildirim ayarları güncellendi')
      
      // For now, just show success
      toast.success('Bildirim ayarı güncellendi')
    } catch (error) {
      // Revert on error
      setNotificationSettings(notificationSettings)
      toast.error('Ayarlar kaydedilirken bir hata oluştu')
    } finally {
      setIsSavingNotifications(false)
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

  const totalHorses = stablemate?.horses?.length || 0
  const activeHorses = stablemate?.horses?.filter((h) => h.status === 'RACING').length || 0
  const retiredHorses = stablemate?.horses?.filter((h) => h.status === 'RETIRED').length || 0
  const broodmares = stablemate?.horses?.filter((h) => h.status === 'MARE').length || 0
  const createdAtFormatted = stablemate ? formatDate(new Date(stablemate.createdAt)) : '-'
  const foundationYearFormatted = stablemate?.foundationYear ? stablemate.foundationYear.toString() : '—'
  const locationFormatted = stablemate?.location || '—'
  const coOwnerCount = stablemate?.coOwners?.length || 0

  const summaryCards = [
    {
      label: 'Toplam At',
      value: totalHorses,
      icon: Activity,
      accent: 'bg-indigo-100 text-indigo-600',
    },
    {
      label: 'Aktif At',
      value: activeHorses,
      icon: TrendingUp,
      accent: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: 'Emekli / Damızlık',
      value: retiredHorses + broodmares,
      icon: Clock,
      accent: 'bg-amber-100 text-amber-600',
    },
    {
      label: 'Ortak Sahip',
      value: coOwnerCount,
      icon: Users,
      accent: 'bg-purple-100 text-purple-600',
    },
  ]

  const detailCards = [
    { label: 'Kuruluş Yılı', value: foundationYearFormatted },
    { label: 'Hesap Açılış Tarihi', value: createdAtFormatted },
    { label: 'Konum', value: locationFormatted },
    {
      label: 'Web Sitesi',
      value: stablemate?.website || '—',
      href: stablemate?.website,
    },
  ]

  if (!stablemate && !isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{TR.stablemate.title}</h1>
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Henüz eküri oluşturulmamış</p>
            <p className="text-sm mt-2">Lütfen onboarding sürecini tamamlayın.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
    <div className="space-y-8 pb-10">
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-500">Eküri Profili</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">{stablemate?.name}</h1>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map(({ label, value, icon: Icon, accent }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/80 bg-white/80 px-4 py-4 shadow-sm flex items-center gap-3"
                >
                  <div className={`rounded-2xl p-2 ${accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
                    <p className="text-2xl font-semibold text-gray-900">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {detailCards.map(({ label, value, href }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/80 bg-white/80 px-4 py-4 shadow-sm"
                >
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">{label}</p>
                  {href && href !== '—' ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-semibold text-indigo-600 underline-offset-4 hover:underline"
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="text-base font-semibold text-gray-900 mt-1">{value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {!isEditing && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-11 rounded-xl border-2 border-gray-200 bg-white/70 px-6 text-sm font-semibold text-gray-700 hover:border-gray-300"
                onClick={() => fetchStablemate()}
              >
                Yenile
              </Button>
              <Button
                className="h-11 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#4f46e5] px-6 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
                onClick={() => setIsEditing(true)}
              >
                {TR.stablemate.editStablemate}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Notification Settings */}
      <Card className="w-full max-w-3xl bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
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
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1">
                <Label htmlFor="horseRegistered" className="text-base font-medium text-gray-900 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-1">
                  <span>Kayıtlar</span>
                  <span className="text-sm font-normal text-gray-500 sm:ml-2">(Atlarımdan biri bir yarışa kaydedildiğinde)</span>
                </Label>
              </div>
              <Checkbox
                id="horseRegistered"
                checked={notificationSettings.horseRegistered}
                onCheckedChange={() => handleNotificationToggle('horseRegistered')}
                disabled={isSavingNotifications}
                className="ml-4"
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1">
                <Label htmlFor="horseDeclared" className="text-base font-medium text-gray-900 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-1">
                  <span>Deklareler</span>
                  <span className="text-sm font-normal text-gray-500 sm:ml-2">(Atlarımdan biri bir yarışa deklare edildiğinde)</span>
                </Label>
              </div>
              <Checkbox
                id="horseDeclared"
                checked={notificationSettings.horseDeclared}
                onCheckedChange={() => handleNotificationToggle('horseDeclared')}
                disabled={isSavingNotifications}
                className="ml-4"
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1">
                <Label htmlFor="newTraining" className="text-base font-medium text-gray-900 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-1">
                  <span>İdmanlar</span>
                  <span className="text-sm font-normal text-gray-500 sm:ml-2">(Atlarımdan biri yeni bir idman yaptığında)</span>
                </Label>
              </div>
              <Checkbox
                id="newTraining"
                checked={notificationSettings.newTraining}
                onCheckedChange={() => handleNotificationToggle('newTraining')}
                disabled={isSavingNotifications}
                className="ml-4"
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1">
                <Label htmlFor="newExpense" className="text-base font-medium text-gray-900 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-1">
                  <span>Giderler</span>
                  <span className="text-sm font-normal text-gray-500 sm:ml-2">(Atlarımdan birine yeni bir gider eklendiğinde)</span>
                </Label>
              </div>
              <Checkbox
                id="newExpense"
                checked={notificationSettings.newExpense}
                onCheckedChange={() => handleNotificationToggle('newExpense')}
                disabled={isSavingNotifications}
                className="ml-4"
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex-1">
                <Label htmlFor="newNote" className="text-base font-medium text-gray-900 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-1">
                  <span>Notlar</span>
                  <span className="text-sm font-normal text-gray-500 sm:ml-2">(Atlarımdan birine yeni bir not eklendiğinde)</span>
                </Label>
              </div>
              <Checkbox
                id="newNote"
                checked={notificationSettings.newNote}
                onCheckedChange={() => handleNotificationToggle('newNote')}
                disabled={isSavingNotifications}
                className="ml-4"
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex-1">
                <Label htmlFor="newRace" className="text-base font-medium text-gray-900 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-1">
                  <span>Yarışlar</span>
                  <span className="text-sm font-normal text-gray-500 sm:ml-2">(Atlarımdan biri yeni bir yarış koştuğunda)</span>
                </Label>
              </div>
              <Checkbox
                id="newRace"
                checked={notificationSettings.newRace}
                onCheckedChange={() => handleNotificationToggle('newRace')}
                disabled={isSavingNotifications}
                className="ml-4"
              />
            </div>
          </div>
        </CardContent>
      </Card>

    </div>

      <Dialog
        open={isEditing}
        onOpenChange={(open) => {
          if (!open) {
            handleCancel()
          } else {
            setIsEditing(true)
          }
        }}
      >
        <DialogContent className="max-w-md bg-transparent border-none shadow-none p-0">
          <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-2xl border border-gray-200/50 overflow-hidden">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
                  <Settings className="h-7 w-7 text-white" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                  Eküri Bilgilerini Güncelle
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  Eküri bilgilerinizi onboarding sırasında olduğu gibi güncelleyin.
                </CardDescription>
              </div>
          </CardHeader>
            <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSave()
              }}
                className="space-y-4"
              >
                <div className="space-y-2 flex flex-col items-center">
                  <Label htmlFor="name" className="text-gray-700 font-medium w-full max-w-xs">
                    {TR.stablemate.name} *
                  </Label>
                <Input
                  id="name"
                    type="text"
                    placeholder="Örn: Mehmet Ali Eküri"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                    required
                  disabled={isSaving}
                    className="h-11 w-full max-w-xs border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
                />
              </div>

                <div className="space-y-2 flex flex-col items-center">
                  <Label htmlFor="foundationYear" className="text-gray-700 font-medium w-full max-w-xs">
                    {TR.stablemate.foundationYear}
                  </Label>
                <Input
                  id="foundationYear"
                  type="number"
                  placeholder="Örn: 2020"
                  value={foundationYear}
                  onChange={(e) => setFoundationYear(e.target.value)}
                    min="1900"
                    max={new Date().getFullYear()}
                  disabled={isSaving}
                    className="h-11 w-full max-w-xs border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

                <div className="space-y-2 flex flex-col items-center">
                  <Label htmlFor="location" className="text-gray-700 font-medium w-full max-w-xs">
                    Konum
                  </Label>
                  <select
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isSaving}
                    className="flex h-11 w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Şehir seçin</option>
                    {RACECOURSE_CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                    {OTHER_CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
              </div>

                <div className="space-y-2 flex flex-col items-center">
                  <Label htmlFor="website" className="text-gray-700 font-medium w-full max-w-xs">
                    {TR.stablemate.website}
                  </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://..."
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={isSaving}
                    className="h-11 w-full max-w-xs border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
                />
              </div>

                <div className="space-y-2 flex flex-col items-center">
                  <Label htmlFor="coOwners" className="text-gray-700 font-medium w-full max-w-xs">
                    {TR.stablemate.coOwners}
                  </Label>
                <textarea
                  id="coOwners"
                  placeholder="Her satıra bir ortak sahip adı"
                  value={coOwners}
                  onChange={(e) => setCoOwners(e.target.value)}
                  disabled={isSaving}
                    className="min-h-[120px] w-full max-w-xs rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

                <div className="flex justify-center gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                    className="h-11 rounded-2xl border-2 border-gray-200 px-6 font-semibold text-gray-700 bg-white/80"
                >
                  {TR.common.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                    className="h-11 rounded-2xl bg-gradient-to-r from-[#6366f1] to-[#4f46e5] px-6 font-semibold text-white shadow-lg hover:shadow-xl"
                >
                  {isSaving ? TR.common.loading : TR.common.save}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </DialogContent>
      </Dialog>
    </>
  )
}

