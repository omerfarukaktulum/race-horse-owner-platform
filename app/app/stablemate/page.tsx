'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog'
import { Checkbox } from '@/app/components/ui/checkbox'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'
import { Building2, Calendar, MapPin, Globe, Users, TrendingUp, Clock, Settings, Bell, UserPlus, UserCircle, Trash2, Search, Check, UserSearch } from 'lucide-react'
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
    trainerId?: string | null
    trainer?: {
      id: string
      fullName?: string | null
    } | null
  }>
  notifyHorseRegistered?: boolean
  notifyHorseDeclared?: boolean
  notifyNewTraining?: boolean
  notifyNewExpense?: boolean
  notifyNewNote?: boolean
  notifyNewRace?: boolean
  trainers?: Array<{
    id: string
    trainerName: string
    trainerExternalId?: string | null
    trainerPhone?: string | null
    notes?: string | null
    trainerProfileId?: string | null
    trainerProfile?: {
      id: string
      fullName: string
      phone?: string | null
      user?: {
        email: string
      } | null
    } | null
  }>
}

export default function StablematePage() {
  const [stablemate, setStablemate] = useState<StablemateData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [ownerRef, setOwnerRef] = useState<string | null>(null)
  const [formaAvailable, setFormaAvailable] = useState(true)

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
  const [isTrainerModalOpen, setIsTrainerModalOpen] = useState(false)
  const [trainerSearchTerm, setTrainerSearchTerm] = useState('')
  const [trainerSearchResults, setTrainerSearchResults] = useState<Array<{ id: string; name: string }>>([])
  const [selectedTrainerResult, setSelectedTrainerResult] = useState<{ id: string; name: string } | null>(null)
  const [isSearchingTrainer, setIsSearchingTrainer] = useState(false)
  const [isSavingTrainer, setIsSavingTrainer] = useState(false)
  const [removingTrainerId, setRemovingTrainerId] = useState<string | null>(null)
  const [isDeleteTrainerDialogOpen, setIsDeleteTrainerDialogOpen] = useState(false)
  const [trainerToDelete, setTrainerToDelete] = useState<string | null>(null)
  const [isTrainerAssignmentOpen, setIsTrainerAssignmentOpen] = useState(false)
  const [trainerAssignments, setTrainerAssignments] = useState<Record<string, string | null>>({})
  const [isSavingAssignments, setIsSavingAssignments] = useState(false)

  useEffect(() => {
    fetchStablemate()
    const fetchOwnerReference = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' })
        if (!response.ok) return
        const data = await response.json()
        setOwnerRef(data.user?.ownerProfile?.officialRef || null)
      } catch (error) {
        console.error('Owner ref fetch error:', error)
        setOwnerRef(null)
      }
    }
    fetchOwnerReference()
  }, [])

  useEffect(() => {
    setFormaAvailable(true)
  }, [ownerRef])

  useEffect(() => {
    if (!isTrainerModalOpen) {
      setTrainerSearchTerm('')
      setTrainerSearchResults([])
      setSelectedTrainerResult(null)
    }
  }, [isTrainerModalOpen])

  const handleTrainerSearch = useCallback(async () => {
    if (trainerSearchTerm.trim().length < 2) {
      setTrainerSearchResults([])
      return
    }

    setIsSearchingTrainer(true)
    try {
      const response = await fetch(`/api/trainers/search?q=${encodeURIComponent(trainerSearchTerm.trim())}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Arama başarısız')
      }

      const resultsArray = Array.isArray(data.results) ? data.results : []
      const normalized = resultsArray
        .map((item: any) => ({
          id: String(item.id ?? item.value ?? item.Id ?? ''),
          name: String(item.name ?? item.text ?? item.Name ?? '').trim(),
        }))
        .filter((item: { id: string; name: string }) => item.id && item.name)

      setTrainerSearchResults(normalized)
    } catch (error) {
      console.error('Trainer search error:', error)
      setTrainerSearchResults([])
    } finally {
      setIsSearchingTrainer(false)
    }
  }, [trainerSearchTerm])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (trainerSearchTerm.length >= 2 && isTrainerModalOpen) {
        await handleTrainerSearch()
      } else if (trainerSearchTerm.length < 2) {
        setTrainerSearchResults([])
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [trainerSearchTerm, isTrainerModalOpen, handleTrainerSearch])

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
      setNotificationSettings({
        horseRegistered: data.stablemate.notifyHorseRegistered ?? true,
        horseDeclared: data.stablemate.notifyHorseDeclared ?? true,
        newTraining: data.stablemate.notifyNewTraining ?? true,
        newExpense: data.stablemate.notifyNewExpense ?? true,
        newNote: data.stablemate.notifyNewNote ?? true,
        newRace: data.stablemate.notifyNewRace ?? true,
      })
    } catch (error) {
      console.error('Fetch stablemate error:', error)
      toast.error('Eküri yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectTrainerResult = (result: { id: string; name: string }) => {
    setSelectedTrainerResult(result)
  }

  const handleAddTrainer = async () => {
    if (!selectedTrainerResult) {
      toast.error('Lütfen bir antrenör seçin')
      return
    }

    setIsSavingTrainer(true)
    try {
      const response = await fetch('/api/stablemate/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerName: selectedTrainerResult.name,
          trainerExternalId: selectedTrainerResult.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Antrenör eklenemedi')
      }

      toast.success('Antrenör eklendi')
      setIsTrainerModalOpen(false)
      await fetchStablemate()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Antrenör eklenemedi'
      toast.error(message)
    } finally {
      setIsSavingTrainer(false)
    }
  }

  const handleRemoveTrainer = (trainerId: string) => {
    setTrainerToDelete(trainerId)
    setIsDeleteTrainerDialogOpen(true)
  }

  const confirmDeleteTrainer = async () => {
    if (!trainerToDelete) return

    setRemovingTrainerId(trainerToDelete)
    try {
      const response = await fetch(`/api/stablemate/trainers/${trainerToDelete}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Antrenör silinemedi')
      }

      toast.success('Antrenör kaldırıldı')
      await fetchStablemate()
      setIsDeleteTrainerDialogOpen(false)
      setTrainerToDelete(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Antrenör silinemedi'
      toast.error(message)
    } finally {
      setRemovingTrainerId(null)
    }
  }

  const initializeTrainerAssignments = useCallback(() => {
    if (!stablemate?.horses?.length || !stablemate?.trainers) {
      return
    }

    const linkedEntries = stablemate.trainers.filter((entry) => entry.trainerProfileId)
    if (!linkedEntries.length) {
      return
    }

    const selections: Record<string, string | null> = {}

    stablemate.horses.forEach((horse) => {
      const matchingEntry = horse.trainerId
        ? linkedEntries.find((entry) => entry.trainerProfileId === horse.trainerId)
        : null
      if (matchingEntry) {
        selections[horse.id] = matchingEntry.id
      } else {
        selections[horse.id] = null
      }
    })

    setTrainerAssignments(selections)
  }, [stablemate?.horses, stablemate?.trainers])

  const handleOpenAssignmentModal = () => {
    if (!stablemate?.horses?.length) {
      toast.info('Henüz atanacak at bulunmuyor')
      return
    }

    const linkedEntries = (stablemate?.trainers || []).filter((entry) => entry.trainerProfileId)
    if (!linkedEntries.length) {
      toast.error('Önce kayıtlı bir antrenör ekleyin')
      return
    }

    initializeTrainerAssignments()
    setIsTrainerAssignmentOpen(true)
  }

  // Reinitialize assignments when modal opens or stablemate data changes
  useEffect(() => {
    if (isTrainerAssignmentOpen && stablemate?.horses && stablemate?.trainers) {
      initializeTrainerAssignments()
    }
  }, [isTrainerAssignmentOpen, stablemate?.horses, stablemate?.trainers, initializeTrainerAssignments])

  const handleAssignmentChange = (horseId: string, trainerEntryId: string | null) => {
    setTrainerAssignments((prev) => ({
      ...prev,
      [horseId]: trainerEntryId,
    }))
  }

  const handleSaveTrainerAssignments = async () => {
    const assignmentsPayload = Object.entries(trainerAssignments).map(([horseId, trainerEntryId]) => ({
      horseId,
      trainerEntryId,
    }))

    if (!assignmentsPayload.length) {
      setIsTrainerAssignmentOpen(false)
      return
    }

    setIsSavingAssignments(true)
    try {
      const response = await fetch('/api/stablemate/trainers/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: assignmentsPayload }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Atamalar kaydedilemedi')
      }

      toast.success('At antrenör atamaları güncellendi')
      setIsTrainerAssignmentOpen(false)
      await fetchStablemate()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Atamalar kaydedilemedi'
      toast.error(message)
    } finally {
      setIsSavingAssignments(false)
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
      // Only update the name and other editable fields, preserve horses and trainers
      setStablemate((prev) => ({
        ...prev,
        ...data.stablemate,
        horses: prev?.horses || [],
        trainers: prev?.trainers || [],
      }))
      setIsEditing(false)
      // Notify navbar to refresh the stablemate name
      window.dispatchEvent(new CustomEvent('stablemateNameUpdated', { detail: { name: data.stablemate.name } }))
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
    const newValue = !notificationSettings[key]
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: newValue,
    }))
    
    setIsSavingNotifications(true)
    try {
      const response = await fetch('/api/onboarding/stablemate/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ key, value: newValue }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Ayarlar kaydedilemedi')
      }
      if (data.notificationSettings) {
        setNotificationSettings(data.notificationSettings)
      }
      toast.success('Bildirim ayarı güncellendi')
    } catch (error) {
      setNotificationSettings((prev) => ({
        ...prev,
        [key]: !newValue,
      }))
      toast.error(
        error instanceof Error ? error.message : 'Ayarlar kaydedilirken bir hata oluştu',
      )
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
  const summaryCards = [
    {
      label: 'Toplam At',
      value: totalHorses,
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

  const stablemateTrainers = stablemate?.trainers || []
  const assignableTrainerEntries = stablemateTrainers.filter((entry) => entry.trainerProfileId)
  const hasAssignableTrainers = assignableTrainerEntries.length > 0
  const horsesList = stablemate?.horses || []

  const notificationOptions: Array<{
    key: keyof typeof notificationSettings
    title: string
    description: string
  }> = [
    {
      key: 'horseRegistered',
      title: 'Kayıtlar',
      description: 'Atlarımdan biri bir yarışa kaydedildiğinde bildirim al.',
    },
    {
      key: 'horseDeclared',
      title: 'Deklareler',
      description: 'Atlarımdan biri bir yarışa deklare edildiğinde bilgi ver.',
    },
    {
      key: 'newTraining',
      title: 'İdmanlar',
      description: 'Atlarımdan biri yeni bir idman yaptığında haber ver.',
    },
    {
      key: 'newExpense',
      title: 'Giderler',
      description: 'Atlarımdan birine yeni bir gider eklendiğinde bilgi al.',
    },
    {
      key: 'newNote',
      title: 'Notlar',
      description: 'Atlarımdan birine yeni bir not girildiğinde bildirim al.',
    },
    {
      key: 'newRace',
      title: 'Yarış Sonuçları',
      description: 'Atlarımdan biri bir yarışı tamamladığında sonuçları bildir.',
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] items-start">
        <Card className="bg-white/95 border border-indigo-100 shadow-lg w-full max-w-3xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              {ownerRef && formaAvailable ? (
                <div className="w-12 h-12 rounded-xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
                  <img
                    src={`https://medya-cdn.tjk.org/formaftp/${ownerRef}.jpg`}
                    alt="Eküri Forması"
                    className="w-full h-full object-contain"
                    onError={() => {
                      setFormaAvailable(false)
                    }}
                  />
                </div>
              ) : (
                <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600">
                  <Building2 className="h-5 w-5" />
                </div>
              )}
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Eküri Profili</CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  {stablemate?.name}
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
                    <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                      {value}
                    </p>
                </div>
              ))}
            </div>
              <div className="flex flex-wrap gap-2">
                {detailCards.map(({ label, value, href }) => (
                  <div
                    key={label}
                    className="rounded-md border border-gray-100 bg-white px-3 py-2 shadow-sm inline-flex flex-col"
                  >
                    <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
                    {href && href !== '—' ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-indigo-600 underline-offset-4 hover:underline mt-1 inline-flex items-center gap-1"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-gray-900 mt-1">{value}</p>
                    )}
          </div>
                ))}
          </div>
          {!isEditing && (
                <div className="flex justify-end pt-2">
              <Button
                className="h-11 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#4f46e5] px-6 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
                onClick={() => setIsEditing(true)}
              >
                    Düzenle
              </Button>
            </div>
          )}
        </div>
          </CardContent>
        </Card>

        {/* Trainer Management */}
        <Card className="w-full bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Antrenör Yönetimi</CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Ekürinize bağlı antrenörleri yönetin
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-start gap-4">
              <div className="flex flex-wrap gap-2">
              <Button
                  variant="secondary"
                  className="rounded-md bg-indigo-600/10 text-indigo-700 hover:bg-indigo-600/20 flex items-center gap-2"
                  onClick={() => setIsTrainerModalOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  Antrenör Ekle
                </Button>
                <Button
                  variant="secondary"
                  className="rounded-md bg-indigo-600/10 text-indigo-700 hover:bg-indigo-600/20 flex items-center gap-2 disabled:opacity-60"
                  onClick={handleOpenAssignmentModal}
                  disabled={!hasAssignableTrainers}
                  title={
                    hasAssignableTrainers
                      ? 'Atlarınıza antrenör atayın'
                      : 'Atama yapabilmek için kayıtlı bir antrenör gerekli'
                  }
                >
                  <Users className="h-4 w-4" />
                  Antrenör Değiştir
              </Button>
            </div>
            </div>
            {stablemateTrainers.length ? (
              <div className="flex flex-col gap-2">
                {stablemateTrainers.map((trainer) => {
                  const isLinked = !!trainer.trainerProfileId
                  const statusLabel = isLinked ? 'Bağlandı' : 'Bekleniyor'
                  const statusClass = isLinked
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                  
                  // Count horses assigned to this trainer
                  const horseCount = horsesList.filter(
                    (horse) => horse.trainerId === trainer.trainerProfileId
                  ).length
                  
                  const trainerProfileName = trainer.trainerProfile?.fullName
                  
                  return (
                    <div
                      key={trainer.id}
                      className="flex flex-col w-full rounded-md border border-gray-100 bg-white px-3 py-3 shadow-sm relative group"
                    >
                      <div className="flex items-center gap-3 flex-wrap w-full">
                        <UserCircle className="h-8 w-8 text-indigo-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{trainer.trainerName}</p>
                          {trainerProfileName && trainerProfileName.trim() !== trainer.trainerName.trim() && (
                            <p className="text-xs text-gray-500 truncate">{trainerProfileName}</p>
          )}
        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusClass}`}>
                          {statusLabel}
                        </span>
                        {horseCount > 0 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                            {horseCount} At
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 flex-shrink-0"
                          onClick={() => handleRemoveTrainer(trainer.id)}
                          disabled={removingTrainerId === trainer.id}
                          aria-label="Antrenörü kaldır"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-6 text-center text-sm text-gray-600">
                Henüz bir antrenör eklenmedi. Başlamak için &ldquo;Antrenör Ekle&rdquo; butonuna tıklayın.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Notification Settings */}
      <Card className="w-full max-w-2xl bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
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
              {notificationOptions.map((item, index) => {
                const enabled = notificationSettings[item.key]
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
                      disabled={isSavingNotifications}
                      onClick={() => handleNotificationToggle(item.key)}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        enabled ? 'bg-gradient-to-r from-[#6366f1] to-[#4f46e5]' : 'bg-gray-200'
                      } ${isSavingNotifications ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
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
    </div>

      <Dialog open={isTrainerModalOpen} onOpenChange={setIsTrainerModalOpen}>
        <DialogContent className="max-w-md bg-transparent border-none shadow-none p-0">
          <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-2xl border border-gray-200/50 flex flex-col max-h-[90vh]">
            <CardHeader className="text-center space-y-4 flex-shrink-0">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
                  <UserSearch className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                  Antrenör Ekle
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  TJK aramasını kullanarak iş birliği yapmak istediğiniz antrenörleri ekleyin.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col p-6">
              {/* Fixed input section */}
              <div className="space-y-2 flex-shrink-0 mb-4">
                <Label htmlFor="trainerSearch" className="text-gray-700 font-medium">
                  Antrenör Ara
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="trainerSearch"
                    type="text"
                    placeholder="Antrenör adını yazın (en az 2 karakter)"
                    value={trainerSearchTerm}
                    onChange={(e) => setTrainerSearchTerm(e.target.value)}
                    className="pl-10 h-11 border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
                    disabled={isSearchingTrainer}
                  />
                </div>
                {isSearchingTrainer && (
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#6366f1]"></span>
                    Aranıyor...
                  </p>
                )}
              </div>

              {/* Dynamic results section - grows with content, scrollable if too many */}
              {trainerSearchResults.length > 0 && (
                <div className="flex flex-col space-y-3 mb-4 flex-shrink-0">
                  <Label className="text-gray-700 font-medium">Antrenör Seç</Label>
                  <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                    {trainerSearchResults.map((result) => {
                      const isSelected = selectedTrainerResult?.id === result.id
                      return (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => handleSelectTrainerResult(result)}
                          className={`w-full p-4 text-left border-2 rounded-lg transition-all duration-300 bg-gradient-to-br from-indigo-50/60 via-indigo-50/40 to-white shadow-lg ${
                            isSelected
                              ? 'border-[#6366f1] shadow-xl from-indigo-50/80 via-indigo-50/60 to-white'
                              : 'border-indigo-100/50 hover:border-indigo-200 hover:shadow-xl'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-gray-200 overflow-hidden bg-white flex items-center justify-center">
                                <UserCircle className="w-8 h-8 text-[#6366f1]" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{result.name}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  TJK ID: {result.id}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Seçim yaptıktan sonra antrenör ekürinize eklenecektir.
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex-shrink-0 ml-3">
                                <div className="w-6 h-6 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Fixed button section */}
              <div className="flex justify-end pt-4 flex-shrink-0">
                <Button
                  onClick={handleAddTrainer}
                  disabled={!selectedTrainerResult || isSavingTrainer}
                  className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6"
                >
                  {isSavingTrainer ? TR.common.loading : 'Antrenörü Ekle'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      <Dialog open={isTrainerAssignmentOpen} onOpenChange={setIsTrainerAssignmentOpen}>
        <DialogContent className="max-w-3xl bg-white/95 border border-indigo-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Antrenör Değiştir</DialogTitle>
            <DialogDescription>
              Ekürinize bağlı atlar için hangi antrenörün sorumlu olduğunu belirleyin.
            </DialogDescription>
          </DialogHeader>
          {hasAssignableTrainers ? (
            horsesList.length ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {horsesList.map((horse) => {
                  const currentSelection = trainerAssignments[horse.id] ?? ''
                  return (
                    <div
                      key={horse.id}
                      className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-base font-semibold text-gray-900">{horse.name}</p>
                        <p className="text-xs text-gray-500">
                          {horse.status || 'Durum bilinmiyor'}
                          {horse.trainer?.fullName ? ` • Aktif: ${horse.trainer.fullName}` : ''}
                        </p>
                      </div>
                      <select
                        value={currentSelection}
                        onChange={(e) =>
                          handleAssignmentChange(
                            horse.id,
                            e.target.value ? e.target.value : null
                          )
                        }
                        className="h-11 rounded-xl border border-indigo-100 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-w-[220px]"
                      >
                        <option value="">Antrenör seçin</option>
                        {assignableTrainerEntries.map((trainer) => (
                          <option key={trainer.id} value={trainer.id}>
                            {trainer.trainerName}{' '}
                            {trainer.trainerProfile?.fullName &&
                              `(${trainer.trainerProfile.fullName})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-6 text-center text-sm text-gray-600">
                Ekürinize bağlı at bulunamadı.
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-6 text-sm text-amber-700">
              Atlara antrenör atayabilmek için önce kayıtlı (hesabı doğrulanmış) bir antrenör eklemelisiniz.
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTrainerAssignmentOpen(false)}
              className="h-11 rounded-2xl"
            >
              {TR.common.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleSaveTrainerAssignments}
              disabled={!hasAssignableTrainers || isSavingAssignments}
              className="h-11 rounded-2xl bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white disabled:opacity-60"
            >
              {isSavingAssignments ? TR.common.loading : 'Atamaları Kaydet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Delete Trainer Dialog */}
      <Dialog
        open={isDeleteTrainerDialogOpen}
        onOpenChange={(value) => {
          setIsDeleteTrainerDialogOpen(value)
          if (!value) {
            setTrainerToDelete(null)
          }
        }}
      >
        <DialogContent className="max-w-sm bg-white/95 backdrop-blur border border-rose-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">Antrenörü Kaldır</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bu antrenörü ekürinizden kaldırmak istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteTrainerDialogOpen(false)
                setTrainerToDelete(null)
              }}
              className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
              disabled={removingTrainerId !== null}
            >
              İptal
            </Button>
            <Button
              onClick={confirmDeleteTrainer}
              disabled={removingTrainerId !== null}
              className="bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md hover:from-rose-600 hover:to-rose-700"
            >
              {removingTrainerId !== null ? TR.common.loading : 'Kaldır'}
            </Button>
                  </div>
        </DialogContent>
      </Dialog>
        </>
  )
}

