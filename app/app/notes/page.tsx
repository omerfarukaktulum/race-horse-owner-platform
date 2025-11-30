'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Filter, Pencil, Plus, Trash2, X, Image, ChevronLeft, ChevronRight, Search, FileText } from 'lucide-react'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { formatDateShort } from '@/lib/utils/format'
import { TR } from '@/lib/constants/tr'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { AddNoteModal } from '@/app/components/modals/add-note-modal'
import { toast } from 'sonner'
import { useAuth } from '@/lib/context/auth-context'
import { EmptyState } from '@/app/components/horse-detail/EmptyState'

interface Note {
  id: string
  date: string
  createdAt: string
  note: string
  photoUrl?: string | string[] | null // Only present when fetched on-demand
  hasPhoto?: boolean // Flag indicating if note has photos (from list)
  kiloValue?: number | null
  addedById: string
  horse: {
    id: string
    name: string
    stablemate?: {
      id: string
      name: string
    } | null
  }
  addedBy: {
    email: string
    role: string
    ownerProfile?: { officialName: string }
    trainerProfile?: { fullName: string }
    name?: string
  }
}

type RangeKey = 'lastWeek' | 'lastMonth' | 'last3Months' | 'thisYear'

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'lastWeek', label: 'Son 1 Hafta' },
  { value: 'lastMonth', label: 'Son 1 Ay' },
  { value: 'last3Months', label: 'Son 3 Ay' },
  { value: 'thisYear', label: 'Bu Yıl' },
]

const ROLE_MAP: Record<string, string> = {
  OWNER: 'At Sahibi',
  TRAINER: 'Antrenör',
  GROOM: 'Groom',
}

function getPhotoList(photoUrl?: string | string[] | null) {
  if (!photoUrl) return []
  if (Array.isArray(photoUrl)) return photoUrl.filter(Boolean)
  try {
    const parsed = JSON.parse(photoUrl)
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean)
    }
  } catch {
    // ignore parse error treat as string
  }
  return [photoUrl].filter(Boolean)
}

export default function NotesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [addedByFilters, setAddedByFilters] = useState<string[]>([])
  const [stablemateFilters, setStablemateFilters] = useState<string[]>([])
  const [availableStablemates, setAvailableStablemates] = useState<string[]>([])
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [availableHorsesForAdd, setAvailableHorsesForAdd] = useState<{ id: string; name: string }[]>([])
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null)
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null)
  const [attachmentViewer, setAttachmentViewer] = useState<{
    open: boolean
    attachments: string[]
    currentIndex: number
  }>({
    open: false,
    attachments: [],
    currentIndex: 0,
  })

  useEffect(() => {
    const highlightParam = searchParams?.get('highlightNote')
    if (highlightParam) {
      setHighlightedNoteId(highlightParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (!highlightedNoteId) return
    const timer = setTimeout(() => {
      setHighlightedNoteId(null)
    }, 6000)
    return () => clearTimeout(timer)
  }, [highlightedNoteId])

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/notes', {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Notlar yüklenemedi')
      }

      setNotes(data.notes || [])
      
      // Store available stablemates for trainers (from API)
      if (user?.role === 'TRAINER' && data.stablemates) {
        setAvailableStablemates(data.stablemates)
      }
    } catch (error) {
      console.error('Fetch notes error:', error)
      toast.error('Notlar yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement
      if (showFilterDropdown && !target.closest('.filter-dropdown-container')) {
        setShowFilterDropdown(false)
      }
    }

    if (showFilterDropdown) {
      // Use a small timeout to avoid immediate closure when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside as any)
        document.addEventListener('touchstart', handleClickOutside as any)
      }, 0)
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside as any)
        document.removeEventListener('touchstart', handleClickOutside as any)
      }
    }
  }, [showFilterDropdown])


  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      // Sort by date (tarih) descending - latest entries at the top
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA
    })
  }, [notes])

  const filteredNotes = useMemo(() => {
    let filtered = sortedNotes

    // Apply date range filter
    if (selectedRange) {
      const now = new Date()
      let startDate: Date | null = null

      switch (selectedRange) {
        case 'lastWeek':
          startDate = new Date(now)
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'lastMonth':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case 'last3Months':
          startDate = new Date(now)
          startDate.setMonth(startDate.getMonth() - 3)
          break
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = null
      }

      if (startDate) {
        filtered = filtered.filter(note => {
          const noteDate = new Date(note.date)
          return noteDate >= startDate!
        })
      }
    }

    // Apply addedBy filter (by role only)
    if (addedByFilters.length > 0) {
      filtered = filtered.filter((note) => {
        const role = note.addedBy?.role || 'Unknown'
        // Handle "At Sahibi" as value for OWNER role
        const filterValue = role === 'OWNER' ? 'At Sahibi' : role
        return addedByFilters.includes(filterValue) || addedByFilters.includes(role)
      })
    }

    // Apply stablemate filter (for trainers)
    if (stablemateFilters.length > 0 && user?.role === 'TRAINER') {
      filtered = filtered.filter((note) => {
        const stablemateName = note.horse?.stablemate?.name
        return stablemateName && stablemateFilters.includes(stablemateName)
      })
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((note) => {
        // Search in horse name (At)
        if (note.horse?.name && note.horse.name.toLowerCase().includes(query)) {
          return true
        }
        // Search in note text (Not)
        if (note.note && note.note.toLowerCase().includes(query)) {
          return true
        }
        return false
      })
    }

    return filtered
  }, [selectedRange, addedByFilters, stablemateFilters, sortedNotes, searchQuery, user?.role])

  // Get unique addedBy users (by role only)
  const getUniqueAddedBy = useMemo(() => {
    const roleMap: Record<string, string> = {
      OWNER: 'At Sahibi',
      TRAINER: 'Antrenör',
      GROOM: 'Groom',
      ADMIN: 'Admin',
    }
    const roleSet = new Set<string>()
    sortedNotes.forEach((note) => {
      if (note.addedBy && note.addedBy.role) {
        roleSet.add(note.addedBy.role)
      }
    })
    const roles = Array.from(roleSet)
    return roles.map((role) => ({
      value: role === 'OWNER' ? 'At Sahibi' : role,
      label: roleMap[role] || role,
    }))
  }, [sortedNotes])

  // Get unique stablemates (for trainers) - use API-provided list
  const getUniqueStablemates = useMemo(() => {
    if (user?.role !== 'TRAINER') return []
    // Use stablemates from API (all accessible stablemates) instead of just visible notes
    return availableStablemates
  }, [availableStablemates, user?.role])

  useEffect(() => {
    if (highlightedNoteId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      highlightedRowRef.current = null
    }
  }, [highlightedNoteId, filteredNotes.length])

  // Toggle functions
  const toggleAddedByFilter = (addedBy: string) => {
    setAddedByFilters((prev) =>
      prev.includes(addedBy)
        ? prev.filter((a) => a !== addedBy)
        : [...prev, addedBy]
    )
  }

  const toggleStablemateFilter = (stablemate: string) => {
    setStablemateFilters((prev) =>
      prev.includes(stablemate)
        ? prev.filter((s) => s !== stablemate)
        : [...prev, stablemate]
    )
  }

  const clearFilters = () => {
    setSelectedRange(null)
    setAddedByFilters([])
    setStablemateFilters([])
  }

  const hasActiveFilters =
    !!selectedRange || addedByFilters.length > 0 || stablemateFilters.length > 0

  const formatAddedBy = (note: Note) => {
    if (!note.addedBy) return '-'
    const roleLabel = ROLE_MAP[note.addedBy.role] || note.addedBy.role || ''
    const profileName =
      note.addedBy.ownerProfile?.officialName || 
      note.addedBy.trainerProfile?.fullName || 
      note.addedBy.name ||
      ''

    // Always show role label, and name in parentheses if available
    if (profileName) {
      return `${roleLabel} (${profileName})`
    }

    return roleLabel || 'Bilinmiyor'
  }

  const handleEditClick = (note: Note) => {
    setEditingNote(note)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (note: Note) => {
    setNoteToDelete(note)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteNote = async () => {
    if (!noteToDelete) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/horse-notes/${noteToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Not silinemedi')
      }
      toast.success('Not başarıyla silindi')
      setIsDeleteDialogOpen(false)
      setNoteToDelete(null)
      fetchNotes()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Not silinirken hata oluştu'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const openAttachmentViewer = async (note: Note, startIndex = 0) => {
    // If photoUrl is already loaded, use it
    let attachments = getPhotoList(note.photoUrl)
    
    // If hasPhoto is true but photoUrl is not loaded, fetch it
    if (note.hasPhoto && !attachments.length) {
      try {
        const response = await fetch(`/api/horse-notes/${note.id}`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          attachments = getPhotoList(data.photoUrl)
          // Update the note in state with the fetched photoUrl
          setNotes(prev => prev.map(n => 
            n.id === note.id ? { ...n, photoUrl: data.photoUrl } : n
          ))
        }
      } catch (error) {
        console.error('Failed to fetch note photoUrl:', error)
        toast.error('Fotoğraflar yüklenirken hata oluştu')
        return
      }
    }
    
    if (!attachments.length) return
    
    setAttachmentViewer({
      open: true,
      attachments,
      currentIndex: startIndex,
    })
  }

  const closeAttachmentViewer = () => {
    setAttachmentViewer({
      open: false,
      attachments: [],
      currentIndex: 0,
    })
  }

  const showPrevAttachment = () => {
    setAttachmentViewer((prev) => {
      const total = prev.attachments.length
      if (!total) return prev
      return {
        ...prev,
        currentIndex: (prev.currentIndex - 1 + total) % total,
      }
    })
  }

  const showNextAttachment = () => {
    setAttachmentViewer((prev) => {
      const total = prev.attachments.length
      if (!total) return prev
      return {
        ...prev,
        currentIndex: (prev.currentIndex + 1) % total,
      }
    })
  }

  const handleAddNoteClick = async () => {
    // Fetch horses to select from
    try {
      const response = await fetch('/api/horses', {
        credentials: 'include',
      })
      const data = await response.json()
      if (response.ok && data.horses && data.horses.length > 0) {
        const formattedHorses = data.horses.map((horse: any) => ({
          id: horse.id,
          name: horse.name,
        }))
        setAvailableHorsesForAdd(formattedHorses)
        setIsAddModalOpen(true)
      } else {
        toast.error('Not eklemek için önce bir at eklemeniz gerekiyor')
      }
    } catch (error) {
      console.error('Fetch horses error:', error)
      toast.error('Atlar yüklenirken bir hata oluştu')
    }
  }

  const closeAddModal = () => {
    setIsAddModalOpen(false)
    setAvailableHorsesForAdd([])
  }

  const hasNotes = (notes?.length || 0) > 0
  const isEditModalVisible = isEditModalOpen && !!editingNote

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
          </div>
          <p className="text-gray-900 font-bold text-lg">{TR.common.loading}</p>
          <p className="text-sm text-gray-600 mt-2">Notlar yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Mobile: Sticky Buttons */}
      <div className="md:hidden mt-4 pb-0 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative filter-dropdown-container">
            <Button
              variant="outline"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`border-2 font-medium px-3 h-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
                hasActiveFilters
                  ? 'border-[#6366f1] bg-indigo-50 text-[#6366f1]'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#6366f1] text-white text-xs font-semibold">
                  {(selectedRange ? 1 : 0) + addedByFilters.length + stablemateFilters.length}
                </span>
              )}
            </Button>

            {/* Filter Dropdown */}
            {showFilterDropdown && (
              <div 
                className="absolute left-0 top-full mt-2 w-52 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 filter-dropdown-container"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Filtreler</h3>
                  <button
                    onClick={() => setShowFilterDropdown(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Date Range Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Tarih Aralığı</label>
                  <div className="flex flex-wrap gap-2">
                    {RANGE_OPTIONS.map(option => {
                      const isActive = selectedRange === option.value
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            const nextValue = isActive ? null : option.value
                            setSelectedRange(nextValue)
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Added By Filter */}
                {getUniqueAddedBy.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Ekleyen</label>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueAddedBy.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => toggleAddedByFilter(option.value)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            addedByFilters.includes(option.value)
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stablemate Filter (for trainers) */}
                {user?.role === 'TRAINER' && getUniqueStablemates.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Eküri</label>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueStablemates.map((stablemate) => (
                        <button
                          key={stablemate}
                          onClick={() => toggleStablemateFilter(stablemate)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            stablemateFilters.includes(stablemate)
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {stablemate}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      clearFilters()
                      setShowFilterDropdown(false)
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Search Button */}
          {!isSearchOpen ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSearchOpen(true)}
              className="h-10 w-10 p-0 border-2 border-gray-300 hover:bg-gray-50"
            >
              <Search className="h-4 w-4 text-gray-600" />
            </Button>
          ) : (
            <div className="relative w-48 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="At, not..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-10 w-full pl-8 pr-8 text-sm border-2 border-[#6366f1] bg-indigo-50 text-gray-900 rounded-lg shadow-md focus:border-[#6366f1] focus:outline-none transition-all duration-300 placeholder:text-gray-500 placeholder:text-sm"
                autoFocus
                style={{ boxShadow: 'none' }}
                onFocus={(e) => {
                  e.target.style.boxShadow = 'none'
                  e.target.style.outline = 'none'
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false)
                  setSearchQuery('')
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Floating Action Button (FAB) for Add Note */}
      <Button
        onClick={handleAddNoteClick}
        className="md:hidden fixed right-4 z-40 h-12 w-12 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center p-0 fab-button"
        style={{ bottom: 'calc(var(--bottom-tab-bar-height, 73px) + 1rem)' }}
      >
        <Plus className="h-5 w-5" />
      </Button>

      {/* Desktop: Filter and Add buttons (normal layout) */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative filter-dropdown-container">
            <Button
              variant="outline"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`border-2 font-medium px-3 h-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
                hasActiveFilters
                  ? 'border-[#6366f1] bg-indigo-50 text-[#6366f1]'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#6366f1] text-white text-xs font-semibold">
                  {(selectedRange ? 1 : 0) + addedByFilters.length + stablemateFilters.length}
                </span>
              )}
            </Button>

            {showFilterDropdown && (
              <div 
                className="absolute left-0 top-full mt-2 w-52 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 filter-dropdown-container"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Filtreler</h3>
                  <button
                    onClick={() => setShowFilterDropdown(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Date Range Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Tarih Aralığı</label>
                  <div className="flex flex-wrap gap-2">
                    {RANGE_OPTIONS.map(option => {
                      const isActive = selectedRange === option.value
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            const nextValue = isActive ? null : option.value
                            setSelectedRange(nextValue)
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Added By Filter */}
                {getUniqueAddedBy.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Ekleyen</label>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueAddedBy.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => toggleAddedByFilter(option.value)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            addedByFilters.includes(option.value)
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stablemate Filter (for trainers) */}
                {user?.role === 'TRAINER' && getUniqueStablemates.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Eküri</label>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueStablemates.map((stablemate) => (
                        <button
                          key={stablemate}
                          onClick={() => toggleStablemateFilter(stablemate)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            stablemateFilters.includes(stablemate)
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {stablemate}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      clearFilters()
                      setShowFilterDropdown(false)
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Search Button */}
          {!isSearchOpen ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSearchOpen(true)}
              className="h-10 w-10 p-0 border-2 border-gray-300 hover:bg-gray-50"
            >
              <Search className="h-4 w-4 text-gray-600" />
            </Button>
          ) : (
            <div className="relative w-48 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="At, not..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-10 w-full pl-8 pr-8 text-sm border-2 border-[#6366f1] bg-indigo-50 text-gray-900 rounded-lg shadow-md focus:border-[#6366f1] focus:outline-none transition-all duration-300 placeholder:text-gray-500 placeholder:text-sm"
                autoFocus
                style={{ boxShadow: 'none' }}
                onFocus={(e) => {
                  e.target.style.boxShadow = 'none'
                  e.target.style.outline = 'none'
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false)
                  setSearchQuery('')
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <Button
            onClick={handleAddNoteClick}
            className="h-10 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all"
          >
            Ekle
          </Button>
        </div>
      </div>

      {/* Mobile: Spacer for fixed header */}
      {/* Mobile: Scrollable Card Layout */}
      <div className="md:hidden pb-8" style={{ paddingBottom: 'calc(5rem + var(--bottom-tab-bar-height, 73px))' }}>
            {isLoading ? (
              <div className="py-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
                </div>
                <p className="text-gray-900 font-bold text-lg">{TR.common.loading}</p>
                <p className="text-sm text-gray-600 mt-2">Notlar yükleniyor...</p>
              </div>
            ) : !hasNotes ? (
              <div className="mt-4">
                <EmptyState
                  icon={FileText}
                  title="Not bulunmuyor"
                  description="Ekürünüz için henüz not eklenmemiş."
                />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                Seçilen filtrelerde not bulunamadı
              </div>
            ) : (
              <>
                {filteredNotes.map((note) => {
                  const isHighlighted = highlightedNoteId === note.id
                  const attachments = getPhotoList(note.photoUrl)
                  const hasAttachments = note.hasPhoto || attachments.length > 0
                  const handleCardClick = () => {
                    if (note.horse?.id) {
                      router.push(`/app/horses/${note.horse.id}?tab=info`)
                    }
                  }
                  return (
                    <div
                      key={note.id}
                      ref={
                        isHighlighted
                          ? (el) => {
                              highlightedRowRef.current = el as any
                            }
                          : undefined
                      }
                      className={`bg-indigo-50/30 border-0 p-4 mb-3 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                        isHighlighted
                          ? 'rounded-2xl border-2 border-indigo-400'
                          : 'rounded-lg'
                      }`}
                      style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 -10px 15px -3px rgba(0, 0, 0, 0.1), 0 -4px 6px -2px rgba(0, 0, 0, 0.05)' }}
                      onClick={handleCardClick}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatDateShort(note.date)}
                            </span>
                            <span className="text-sm font-medium text-indigo-600">
                              {note.horse?.name || '-'}
                            </span>
                          </div>
                          {user?.role === 'TRAINER' && note.horse?.stablemate?.name && (
                            <span className="text-xs text-gray-500">
                              {note.horse.stablemate.name}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {hasAttachments && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation()
                                await openAttachmentViewer(note)
                              }}
                              className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                              title={attachments.length > 0 ? `${attachments.length} ek görüntüle` : 'Ek görüntüle'}
                            >
                              <Image className="h-4 w-4" />
                            </button>
                          )}
                          {user && (user.role === 'OWNER' || user.role === 'TRAINER') && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditClick(note)
                                }}
                                className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                title="Düzenle"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteClick(note)
                                }}
                                className="p-1.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {note.note && (
                        <p className="text-sm text-gray-700 mb-2 line-clamp-3">{note.note}</p>
                      )}
                      {note.kiloValue !== null && note.kiloValue !== undefined && (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-semibold">
                          ⚖️ {note.kiloValue.toFixed(1)} kg
                        </span>
                      )}
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">{formatAddedBy(note)}</span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
      </div>

      {/* Desktop: Table Layout */}
      {!hasNotes ? (
        <div className="hidden md:block mt-4">
          <EmptyState
            icon={FileText}
            title="Not bulunmuyor"
            description="Ekürünüz için henüz not eklenmemiş."
          />
        </div>
      ) : (
        <Card className="hidden md:block bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg overflow-hidden w-full min-w-0">
          <CardContent className="p-0 w-full min-w-0">
            <div className="overflow-x-auto w-full min-w-0">
              <table className="w-full min-w-full">
                  <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Tarih
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        At
                      </th>
                      {user?.role === 'TRAINER' && (
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Eküri
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Not
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Ekleyen
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={user?.role === 'TRAINER' ? 6 : 5} className="px-4 py-6 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-20 h-20 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
                          </div>
                          <p className="text-gray-900 font-bold text-lg">{TR.common.loading}</p>
                          <p className="text-sm text-gray-600 mt-2">Notlar yükleniyor...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredNotes.length === 0 ? (
                    <tr>
                    <td colSpan={user?.role === 'TRAINER' ? 6 : 5} className="px-4 py-6 text-center text-sm text-gray-500">
                        Seçilen filtrelerde not bulunamadı
                      </td>
                    </tr>
                  ) : (
                  filteredNotes.map((note, index) => {
                    const isStriped = index % 2 === 1
                    const isHighlighted = highlightedNoteId === note.id
                    const attachments = getPhotoList(note.photoUrl)
                    const hasAttachments = note.hasPhoto || attachments.length > 0
                    return (
                      <tr
                        key={note.id}
                        ref={
                          isHighlighted
                            ? (el) => {
                                highlightedRowRef.current = el
                              }
                            : undefined
                        }
                        className={`transition-colors ${
                          isHighlighted
                            ? 'bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200 animate-pulse-once'
                            : `${isStriped ? 'bg-gray-50' : ''} hover:bg-indigo-50/50`
                        }`}
                      >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {formatDateShort(note.date)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {note.horse?.name || '-'}
                            </span>
                          </td>
                          {user?.role === 'TRAINER' && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-700">
                                {note.horse?.stablemate?.name || '-'}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3">
                            {note.note ? (
                              <div className="text-sm text-gray-700 space-y-1">
                                <p>{note.note}</p>
                                {note.kiloValue !== null && note.kiloValue !== undefined && (
                                  <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-semibold">
                                    ⚖️ {note.kiloValue.toFixed(1)} kg
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{formatAddedBy(note)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-start gap-2">
                              {hasAttachments && (
                                <button
                                  type="button"
                                  onClick={async () => await openAttachmentViewer(note)}
                                  className="p-2 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-sm"
                                  title={attachments.length > 0 ? `${attachments.length} ek görüntüle` : 'Ek görüntüle'}
                                >
                                  <Image className="h-4 w-4" />
                                </button>
                              )}
                              {user && (user.role === 'OWNER' || user.role === 'TRAINER') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditClick(note)}
                                    className="p-2 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-sm"
                                    title="Düzenle"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClick(note)}
                                    className="p-2 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800 transition-colors shadow-sm"
                                    title="Sil"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Note Modal */}
      {isAddModalOpen && availableHorsesForAdd.length > 0 && (
        <AddNoteModal
          open={isAddModalOpen}
          onClose={() => {
            closeAddModal()
          }}
          horses={availableHorsesForAdd}
          onSuccess={() => {
            closeAddModal()
            fetchNotes()
          }}
        />
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <AddNoteModal
          open={isEditModalVisible}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingNote(null)
          }}
          horseId={editingNote.horse.id}
          horseName={editingNote.horse.name}
          onSuccess={() => {
            setIsEditModalOpen(false)
            setEditingNote(null)
            fetchNotes()
          }}
          mode="edit"
          noteId={editingNote.id}
          initialNote={{
            date: editingNote.date,
            note: editingNote.note,
            photoUrl: editingNote.photoUrl,
          }}
          submitLabel="Kaydet"
        />
      )}

      {/* Delete Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(value) => {
          setIsDeleteDialogOpen(value)
          if (!value) {
            setNoteToDelete(null)
          }
        }}
      >
        <DialogContent className="max-w-sm bg-white/95 backdrop-blur border border-rose-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">Notu Sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bu notu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setNoteToDelete(null)
              }}
              className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
              disabled={isDeleting}
            >
              İptal
            </Button>
            <Button
              onClick={handleDeleteNote}
              disabled={isDeleting}
              className="bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md hover:from-rose-600 hover:to-rose-700"
            >
              {isDeleting ? TR.common.loading : 'Sil'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attachment Viewer */}
      <Dialog open={attachmentViewer.open} onOpenChange={(value) => !value && closeAttachmentViewer()}>
        <DialogContent className="max-w-3xl bg-white/95 backdrop-blur border border-gray-200 shadow-2xl">
          {attachmentViewer.attachments.length > 0 && (
            <div className="space-y-6">
              <div className="w-full h-[60vh] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <img
                  src={attachmentViewer.attachments[attachmentViewer.currentIndex]}
                  alt={`Ek ${attachmentViewer.currentIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              {attachmentViewer.attachments.length > 1 && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={showPrevAttachment}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Önceki
                  </Button>
                  <span className="text-sm font-medium text-gray-600">
                    {attachmentViewer.currentIndex + 1} / {attachmentViewer.attachments.length}
                  </span>
                  <Button
                    variant="outline"
                    onClick={showNextAttachment}
                    className="flex items-center gap-2"
                  >
                    Sonraki
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}

