'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{TR.stablemate.title}</h1>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            {TR.stablemate.editStablemate}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {stablemate?.name}
          </CardTitle>
          <CardDescription>
            Eküri bilgilerinizi görüntüleyin ve düzenleyin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{TR.stablemate.name} *</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSaving}
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
                  min="1900"
                  max={new Date().getFullYear()}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coOwners">{TR.stablemate.coOwners}</Label>
                <textarea
                  id="coOwners"
                  placeholder="Her satıra bir ortak sahip adı"
                  value={coOwners}
                  onChange={(e) => setCoOwners(e.target.value)}
                  disabled={isSaving}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{TR.stablemate.location}</Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="Örn: İstanbul"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isSaving}
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
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  {TR.common.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? TR.common.loading : TR.common.save}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Toplam At</p>
                        <p className="text-2xl font-bold">{stablemate?.horses?.length || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">Aktif At</p>
                        <p className="text-2xl font-bold">
                          {stablemate?.horses?.filter(h => h.status === 'RACING').length || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-500">Ortak Sahip</p>
                        <p className="text-2xl font-bold">{stablemate?.coOwners?.length || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-6">
                {stablemate?.foundationYear && (
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">{TR.stablemate.foundationYear}</p>
                      <p className="font-medium">{stablemate.foundationYear}</p>
                    </div>
                  </div>
                )}

                {stablemate?.location && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">{TR.stablemate.location}</p>
                      <p className="font-medium">{stablemate.location}</p>
                    </div>
                  </div>
                )}

                {stablemate?.website && (
                  <div className="flex items-start space-x-3">
                    <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">{TR.stablemate.website}</p>
                      <a
                        href={stablemate.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {stablemate.website}
                      </a>
                    </div>
                  </div>
                )}

                {stablemate?.createdAt && (
                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Oluşturulma Tarihi</p>
                      <p className="font-medium">{formatDate(new Date(stablemate.createdAt))}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Co-Owners */}
              {stablemate?.coOwners && stablemate.coOwners.length > 0 && (
                <div className="border-t pt-6">
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-2">{TR.stablemate.coOwners}</p>
                      <ul className="list-disc list-inside space-y-1">
                        {stablemate.coOwners.map((owner, index) => (
                          <li key={index} className="font-medium">
                            {owner}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

