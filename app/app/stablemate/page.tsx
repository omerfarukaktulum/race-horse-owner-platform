'use client'

import { FormEvent, useState, useEffect, useCallback } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog'
import { Checkbox } from '@/app/components/ui/checkbox'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'
import { Building2, Calendar, MapPin, Globe, Users, TrendingUp, Clock, Settings, Bell, UserPlus, UserCircle, Trash2, Search, Check, UserSearch, ShieldCheck, ChevronDown, ChessKing, Plus, Minus } from 'lucide-react'
import { ModalInput, ModalSelect } from '@/app/components/ui/modal-field'
import { formatDate } from '@/lib/utils/format'
import { AddHorseModal } from '@/app/components/modals/add-horse-modal'
import { useAuth } from '@/lib/context/auth-context'
import { useRouter } from 'next/navigation'

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
  const [ownerEmail, setOwnerEmail] = useState<string>('')
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
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isAssignAllDialogOpen, setIsAssignAllDialogOpen] = useState(false)
  const [newlyAddedTrainerEntryId, setNewlyAddedTrainerEntryId] = useState<string | null>(null)
  const [isAssigningToAll, setIsAssigningToAll] = useState(false)
  const [addHorseModalOpen, setAddHorseModalOpen] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchStablemate()
    const fetchOwnerReference = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' })
        if (!response.ok) return
        const data = await response.json()
        setOwnerRef(data.user?.ownerProfile?.officialRef || null)
        setOwnerEmail(data.user?.email || '')
      } catch (error) {
        console.error('Owner ref fetch error:', error)
        setOwnerRef(null)
        setOwnerEmail('')
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
      
      // Show confirmation dialog to assign trainer to all horses
      if (data.trainer?.id) {
        setNewlyAddedTrainerEntryId(data.trainer.id)
        setIsAssignAllDialogOpen(true)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Antrenör eklenemedi'
      toast.error(message)
    } finally {
      setIsSavingTrainer(false)
    }
  }

  const handleAssignTrainerToAll = async () => {
    if (!newlyAddedTrainerEntryId) return

    setIsAssigningToAll(true)
    try {
      const response = await fetch('/api/stablemate/trainers/assign-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerEntryId: newlyAddedTrainerEntryId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Antrenör ataması yapılamadı')
      }

      toast.success(`${data.assignedCount} ata antrenör atandı`)
      setIsAssignAllDialogOpen(false)
      setNewlyAddedTrainerEntryId(null)
      await fetchStablemate()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Antrenör ataması yapılamadı'
      toast.error(message)
    } finally {
      setIsAssigningToAll(false)
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

  // Close any open select dropdowns when modal opens
  useEffect(() => {
    if (isTrainerAssignmentOpen) {
      // Blur any focused select elements to close dropdowns
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && activeElement.tagName === 'SELECT') {
        activeElement.blur()
      }
      // Also blur any selects that might be open
      setTimeout(() => {
        const selects = document.querySelectorAll('select')
        selects.forEach((select) => {
          if (document.activeElement === select) {
            select.blur()
          }
        })
      }, 0)
    }
  }, [isTrainerAssignmentOpen])

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

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError(null)

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Lütfen yeni şifre alanlarını doldurun')
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
      label: 'At Sayısı',
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
        <div className="flex flex-col gap-6 min-w-0">
          <Card className="bg-white/95 border border-indigo-100 shadow-lg w-full min-w-0">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600">
                  <ChessKing className="h-5 w-5" />
                </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Eküri Profili</CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  {stablemate?.name}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto sm:ml-0">
              {!isEditing && (
                <Button
                  className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white font-medium px-2 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-9 md:h-10"
                  onClick={() => setIsEditing(true)}
                >
                  Düzenle
                </Button>
              )}
              {user?.role !== 'TRAINER' && (
                <>
                  <Button 
                    onClick={() => setAddHorseModalOpen(true)}
                    aria-label={TR.horses.addHorse}
                    className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white font-medium px-2 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-9 md:h-10"
                  >
                    {TR.horses.addHorse}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => router.push('/app/horses')}
                    aria-label={TR.horses.removeHorse}
                    className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white font-medium px-2 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-9 md:h-10"
                  >
                    {TR.horses.removeHorse}
                  </Button>
                </>
              )}
            </div>
              </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="w-full min-w-0 bg-white/95 border border-indigo-100 shadow-lg">
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

        <div className="flex flex-col gap-6 min-w-0">
          {/* Trainer Management */}
          <Card className="w-full min-w-0 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
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
                      Antrenör Ata
                    </Button>
                  </div>
                </div>
                {stablemateTrainers.length ? (
                  <div className="flex flex-col gap-2">
                    {stablemateTrainers.map((trainer) => {
                  const isLinked = !!trainer.trainerProfileId && !!trainer.trainerProfile
                  const statusLabel = isLinked ? 'Bağlandı' : 'Bekleniyor'
                  const statusClass = isLinked
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                  
                  // Count horses assigned to this trainer (only if trainer is linked with a profile)
                  const horseCount = isLinked && trainer.trainerProfileId
                    ? horsesList.filter(
                    (horse) => horse.trainerId === trainer.trainerProfileId
                  ).length
                    : 0
                  
                  const trainerProfileName = trainer.trainerProfile?.fullName
                  
                  return (
                    <div
                      key={trainer.id}
                      className={`flex flex-col w-full rounded-md border px-3 py-3 shadow-sm relative group ${
                        isLinked 
                          ? 'sm:border-gray-100 sm:bg-white border-green-200 bg-green-50/50' 
                          : 'sm:border-gray-100 sm:bg-white border-amber-200 bg-amber-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-wrap w-full">
                        <UserCircle className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{trainer.trainerName}</p>
                          {trainerProfileName && trainerProfileName.trim() !== trainer.trainerName.trim() && (
                            <p className="text-xs text-gray-500 truncate">{trainerProfileName}</p>
          )}
        </div>
                        <span className={`hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusClass}`}>
                          {statusLabel}
                        </span>
                        {isLinked && horseCount > 0 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-100">
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

          {/* Account Security */}
          <Card className="w-full min-w-0 bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Hesap Güvenliği</CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    Şifre ve erişim ayarlarınızı yönetin
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handlePasswordUpdate}>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">E-posta Adresi</Label>
                  <Input value={ownerEmail} disabled className="bg-gray-50 border-gray-200" />
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
      </div>
    </div>

      <Dialog open={isTrainerModalOpen} onOpenChange={setIsTrainerModalOpen}>
        <DialogContent className="w-full max-w-full sm:max-w-md max-h-[90vh] p-0 bg-indigo-50/95 backdrop-blur-sm border border-gray-200/50 shadow-xl overflow-hidden flex flex-col flex-nowrap">
          <Card className="border-0 shadow-none flex flex-col flex-nowrap h-full max-h-[90vh]">
            <CardHeader className="space-y-4 flex-shrink-0 flex-nowrap">
              <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                  <UserSearch className="h-8 w-8 text-white" />
                </div>
              <div className="text-center">
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                  Antrenör Ekle
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  TJK aramasını kullanarak iş birliği yapmak istediğiniz antrenörleri ekleyin.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-nowrap gap-4 px-4 pb-6 sm:px-6 sm:pb-6 flex-1 min-h-0 w-full overflow-hidden">
              {/* Fixed input section */}
              <div className="space-y-2 flex-shrink-0 w-full">
                <Label htmlFor="trainerSearch" className="text-gray-700 font-medium">
                  Antrenör Ara
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="trainerSearch"
                    type="text"
                    inputMode="search"
                    placeholder="Antrenör adını yazın..."
                    value={trainerSearchTerm}
                    onChange={(e) => setTrainerSearchTerm(e.target.value)}
                    className="pl-10 h-11 border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1] w-full"
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
                <>
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col flex-nowrap w-full">
                    <Label className="text-gray-700 font-medium mb-3">Antrenör Seç</Label>
                    <div className="overflow-y-auto overflow-x-hidden space-y-2 pr-1 w-full">
                    {trainerSearchResults.map((result) => {
                      const isSelected = selectedTrainerResult?.id === result.id
                      return (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => handleSelectTrainerResult(result)}
                          className={`w-full min-w-0 p-4 text-left border-2 rounded-lg transition-all duration-300 bg-gradient-to-br from-indigo-50/60 via-indigo-50/40 to-white shadow-lg ${
                            isSelected
                              ? 'border-[#6366f1] shadow-xl from-indigo-50/80 via-indigo-50/60 to-white'
                              : 'border-indigo-100/50 hover:border-indigo-200 hover:shadow-xl'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 flex-nowrap">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-gray-200 overflow-hidden bg-white flex items-center justify-center">
                                <UserCircle className="w-8 h-8 text-[#6366f1]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 break-words">{result.name}</p>
                                <p className="text-xs text-gray-600 mt-1 truncate">
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
                </>
              )}

              {/* Fixed button section */}
              <div className="flex justify-end pt-4 border-t border-gray-200 mt-auto flex-shrink-0">
                <Button
                  onClick={handleAddTrainer}
                  disabled={!selectedTrainerResult || isSavingTrainer}
                  className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isSavingTrainer ? TR.common.loading : 'Antrenörü Ekle'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      <Dialog open={isTrainerAssignmentOpen} onOpenChange={setIsTrainerAssignmentOpen}>
        <DialogContent className="w-full max-w-full sm:max-w-md max-h-[90vh] p-0 bg-indigo-50/95 backdrop-blur-sm border border-gray-200/50 shadow-xl overflow-hidden flex flex-col flex-nowrap">
          <Card className="border-0 shadow-none flex flex-col flex-nowrap h-full max-h-[90vh]">
            <CardHeader className="space-y-4 flex-shrink-0 flex-nowrap">
              <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="text-center">
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                  Antrenör Değiştir
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
              Ekürinize bağlı atlar için hangi antrenörün sorumlu olduğunu belirleyin.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-nowrap gap-4 px-4 pb-6 sm:px-6 sm:pb-6 flex-1 min-h-0 w-full overflow-hidden">
          {hasAssignableTrainers ? (
            horsesList.length ? (
                  <>
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col flex-nowrap w-full">
                      <div className="overflow-y-auto overflow-x-hidden space-y-2 pr-1 w-full">
                        {[...horsesList].sort((a, b) => {
                          const aHasTrainer = trainerAssignments[a.id] ?? null
                          const bHasTrainer = trainerAssignments[b.id] ?? null
                          // Horses without trainers first
                          if (!aHasTrainer && bHasTrainer) return -1
                          if (aHasTrainer && !bHasTrainer) return 1
                          return 0
                        }).map((horse) => {
                          const hasTrainer = trainerAssignments[horse.id] ?? null
                  return (
                    <div
                      key={horse.id}
                              className={`flex flex-nowrap items-center gap-3 py-2 px-3 border-2 rounded-lg transition-all duration-200 w-full ${
                                hasTrainer
                                  ? 'border-green-200 bg-green-50/50'
                                  : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                              }`}
                            >
                              {ownerRef && (
                                <div className="flex-shrink-0 w-12 h-12 rounded border-2 border-gray-200 overflow-hidden bg-white flex items-center justify-center relative">
                                  <img
                                    src={`https://medya-cdn.tjk.org/formaftp/${ownerRef}.jpg`}
                                    alt="Eküri Forması"
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      const container = e.currentTarget.parentElement
                                      if (container) {
                                        const icon = container.querySelector('.fallback-icon') as HTMLElement
                                        if (icon) icon.style.display = 'block'
                                      }
                                    }}
                                  />
                                  <UserPlus className="w-8 h-8 text-[#6366f1] fallback-icon hidden" />
                      </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm text-gray-900 truncate">{horse.name}</p>
                                </div>
                                <div className="flex flex-col gap-0.5 text-xs text-gray-600 mt-0.5">
                                  <div className="mt-1 relative inline-block max-w-[200px]">
                      <select
                                      value={trainerAssignments[horse.id] ?? ''}
                        onChange={(e) =>
                          handleAssignmentChange(
                            horse.id,
                            e.target.value ? e.target.value : null
                          )
                        }
                                      className="h-8 rounded-lg border border-gray-300 bg-white px-2 pr-8 text-[10px] text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] appearance-none cursor-pointer w-full"
                                      style={{ 
                                        WebkitAppearance: 'none', 
                                        MozAppearance: 'none'
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Antrenör seçin</option>
                                      {assignableTrainerEntries.map((trainer) => {
                                        const fullName = trainer.trainerProfile?.fullName
                                        const trainerName = trainer.trainerName
                                        // Only show fullName in parentheses if it's different from trainerName
                                        const optionText = fullName && fullName !== trainerName 
                                          ? `${trainerName} (${fullName})`
                                          : trainerName
                                        return (
                          <option key={trainer.id} value={trainer.id}>
                                            {optionText}
                          </option>
                                        )
                                      })}
                      </select>
                                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                  </div>
                                </div>
                              </div>
                    </div>
                  )
                })}
              </div>
                    </div>
                  </>
            ) : (
                  <div className="text-center py-12 flex-shrink-0">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="text-gray-700 font-medium mb-2">Ekürinize bağlı at bulunamadı.</p>
              </div>
            )
          ) : (
                <div className="text-center py-12 flex-shrink-0">
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="h-10 w-10 text-amber-600" />
                  </div>
                  <p className="text-gray-700 font-medium mb-2">Kayıtlı antrenör bulunamadı.</p>
                  <p className="text-sm text-gray-500">Atlara antrenör atayabilmek için önce kayıtlı (hesabı doğrulanmış) bir antrenör eklemelisiniz.</p>
            </div>
          )}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-auto flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTrainerAssignmentOpen(false)}
                  className="border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              {TR.common.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleSaveTrainerAssignments}
              disabled={!hasAssignableTrainers || isSavingAssignments}
                  className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingAssignments ? TR.common.loading : 'Atamaları Kaydet'}
            </Button>
          </div>
            </CardContent>
          </Card>
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
        <DialogContent className="w-[320px] max-h-[90vh] overflow-y-auto bg-indigo-50/95 backdrop-blur-sm shadow-xl border border-gray-200/50 p-4">
          <DialogHeader className="text-center sm:text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
                <Settings className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="w-[240px] mx-auto">
              <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                Eküri Bilgilerini Güncelle
              </DialogTitle>
            </div>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSave()
            }}
          >
            <div className="w-[260px] mx-auto space-y-5">
              <ModalInput
                label={TR.stablemate.name}
                required
                id="name"
                type="text"
                placeholder="Örn: Mehmet Ali Eküri"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
                startIcon={<Building2 className="h-4 w-4" />}
              />

              <ModalInput
                label={TR.stablemate.foundationYear}
                id="foundationYear"
                type="number"
                placeholder="Örn: 2020"
                value={foundationYear}
                onChange={(e) => setFoundationYear(e.target.value)}
                min="1900"
                max={new Date().getFullYear()}
                disabled={isSaving}
                startIcon={<Calendar className="h-4 w-4" />}
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <ModalSelect
                label="Konum"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isSaving}
                icon={<MapPin className="h-4 w-4" />}
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
              </ModalSelect>

              <ModalInput
                label={TR.stablemate.website}
                id="website"
                type="url"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={isSaving}
                startIcon={<Globe className="h-4 w-4" />}
              />

              <div className="pt-2">
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="border-2 border-[#6366f1]/30 hover:bg-[#6366f1]/5 hover:border-[#6366f1]/50 text-[#6366f1]"
                  >
                    {TR.common.cancel}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isSaving ? TR.common.loading : TR.common.save}
                  </Button>
                </div>
              </div>
            </div>
          </form>
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

      {/* Assign Trainer to All Horses Dialog */}
      <Dialog
        open={isAssignAllDialogOpen}
        onOpenChange={(value) => {
          setIsAssignAllDialogOpen(value)
          if (!value) {
            setNewlyAddedTrainerEntryId(null)
          }
        }}
      >
        <DialogContent className="max-w-sm bg-white/95 backdrop-blur border border-indigo-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">Tüm Atlara Atama</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bu antrenörü ekürinizdeki tüm atlara atamak istiyor musunuz?
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignAllDialogOpen(false)
                setNewlyAddedTrainerEntryId(null)
              }}
              className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
              disabled={isAssigningToAll}
            >
              Hayır
            </Button>
            <Button
              onClick={handleAssignTrainerToAll}
              disabled={isAssigningToAll}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md hover:from-indigo-600 hover:to-indigo-700"
            >
              {isAssigningToAll ? TR.common.loading : 'Evet, Tümüne Ata'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Horse Modal */}
      <AddHorseModal
        open={addHorseModalOpen}
        onClose={() => setAddHorseModalOpen(false)}
        onSuccess={() => {
          setAddHorseModalOpen(false)
          fetchStablemate()
        }}
      />
    </>
  )
}

