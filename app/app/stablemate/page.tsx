'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'
import { Building2, Calendar, MapPin, Globe, Users, Activity, TrendingUp, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

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

const heroMeta = [
  stablemate?.location && { label: TR.stablemate.location, value: stablemate.location },
  stablemate?.website && { label: TR.stablemate.website, value: stablemate.website },
].filter(Boolean) as Array<{ label: string; value: string | number }>

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
    <div className="space-y-8 pb-10">
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-500">Eküri Profili</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">{stablemate?.name}</h1>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
              {stablemate?.foundationYear && (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
                  Kuruluş Yılı: <span className="text-gray-900">{stablemate.foundationYear}</span>
                </div>
              )}
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
                Hesap Açılış Tarihi: <span className="text-gray-900">{formatDate(new Date(stablemate?.createdAt || new Date()))}</span>
              </div>
              {heroMeta.map((item) => (
                <div key={item.value} className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
                  {item.label}: <span className="text-gray-900">{item.value}</span>
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

      {isEditing ? (
        <Card className="border-gray-100 shadow-xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-xl font-semibold text-gray-900">Eküri Bilgilerini Güncelle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSave()
              }}
              className="grid gap-6 md:grid-cols-2"
            >
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">{TR.stablemate.name} *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving}
                  className="h-12 rounded-xl border-gray-200 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="foundationYear">{TR.stablemate.foundationYear}</Label>
                <Input
                  id="foundationYear"
                  type="number"
                  placeholder="Örn: 2020"
                  value={foundationYear}
                  onChange={(e) => setFoundationYear(e.target.value)}
                  disabled={isSaving}
                  className="h-12 rounded-xl border-gray-200 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{TR.stablemate.location}</Label>
                <Input
                  id="location"
                  placeholder="Örn: İstanbul"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isSaving}
                  className="h-12 rounded-xl border-gray-200 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">{TR.stablemate.website}</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://..."
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={isSaving}
                  className="h-12 rounded-xl border-gray-200 text-base"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="coOwners">{TR.stablemate.coOwners}</Label>
                <textarea
                  id="coOwners"
                  placeholder="Her satıra bir ortak sahip adı"
                  value={coOwners}
                  onChange={(e) => setCoOwners(e.target.value)}
                  disabled={isSaving}
                  className="min-h-[120px] rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="h-11 rounded-xl border-2 border-gray-200 px-6 font-semibold text-gray-700"
                >
                  {TR.common.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="h-11 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#4f46e5] px-6 font-semibold text-white shadow-lg hover:shadow-xl"
                >
                  {isSaving ? TR.common.loading : TR.common.save}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
            <Card className="border-0 bg-white/90 backdrop-blur">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Toplam At</p>
                  <p className="text-3xl font-semibold text-gray-900">{totalHorses}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/90 backdrop-blur">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Aktif At</p>
                  <p className="text-3xl font-semibold text-gray-900">{activeHorses}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/90 backdrop-blur">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Emekli / Damızlık</p>
                  <p className="text-3xl font-semibold text-gray-900">{retiredHorses + broodmares}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white/90 backdrop-blur">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="rounded-2xl bg-purple-100 p-3 text-purple-600">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ortak Sahip</p>
                  <p className="text-3xl font-semibold text-gray-900">{stablemate?.coOwners?.length || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-0 bg-white/90 backdrop-blur shadow-lg lg:col-span-2">
              <CardContent className="grid gap-6 py-6 md:grid-cols-2">
                {stablemate?.foundationYear && (
                  <div className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4">
                    <Calendar className="mt-1 h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Kuruluş Yılı</p>
                      <p className="text-lg font-semibold text-gray-900">{stablemate.foundationYear}</p>
                      <p className="text-xs text-gray-500 mt-1">Hesap Açılış Tarihi</p>
                    </div>
                  </div>
                )}

                {stablemate?.location && (
                  <div className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4">
                    <MapPin className="mt-1 h-5 w-5 text-rose-500" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500">{TR.stablemate.location}</p>
                      <p className="text-lg font-semibold text-gray-900">{stablemate.location}</p>
                    </div>
                  </div>
                )}

                {stablemate?.website && (
                  <div className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4">
                    <Globe className="mt-1 h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500">{TR.stablemate.website}</p>
                      <a
                        href={stablemate.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-semibold text-indigo-600 underline-offset-4 hover:underline"
                      >
                        {stablemate.website}
                      </a>
                    </div>
                  </div>
                )}

                {stablemate?.createdAt && (
                  <div className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4">
                    <Clock className="mt-1 h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500">Oluşturulma Tarihi</p>
                      <p className="text-lg font-semibold text-gray-900">{formatDate(new Date(stablemate.createdAt))}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/90 backdrop-blur shadow-lg">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Ortak Sahipler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 py-6">
                {stablemate?.coOwners && stablemate.coOwners.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {stablemate.coOwners.map((owner, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm"
                      >
                        <Users className="mr-2 h-4 w-4 text-gray-400" />
                        {owner}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Henüz ortak sahibi bulunmuyor.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

