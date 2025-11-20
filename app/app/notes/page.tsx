'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Filter, Pencil, Plus, Trash2, X, Paperclip, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { formatDateShort } from '@/lib/utils/format'
import { TR } from '@/lib/constants/tr'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { AddNoteModal } from '@/app/components/modals/add-note-modal'
import { toast } from 'sonner'

type NoteCategory = 'Yem Takibi' | 'Gezinti' | 'Hastalık' | 'Gelişim'
const NOTE_CATEGORIES: NoteCategory[] = ['Yem Takibi', 'Gezinti', 'Hastalık', 'Gelişim']

interface Note {
  id: string
  date: string
  note: string
  category?: NoteCategory
  photoUrl?: string | string[] | null
  horse: {
    id: string
    name: string
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
  TRAINER: 'Trainer',
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [addedByFilters, setAddedByFilters] = useState<string[]>([])
  const [categoryFilters, setCategoryFilters] = useState<NoteCategory[]>([])
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedHorseForAdd, setSelectedHorseForAdd] = useState<{ id: string; name: string } | null>(null)
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
    } catch (error) {
      console.error('Fetch notes error:', error)
      toast.error('Notlar yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFilterDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilterDropdown])

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
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

    // Apply category filter
    if (categoryFilters.length > 0) {
      filtered = filtered.filter((note) => note.category && categoryFilters.includes(note.category))
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
  }, [selectedRange, addedByFilters, categoryFilters, sortedNotes, searchQuery])

  // Get unique addedBy users (by role only)
  const getUniqueAddedBy = useMemo(() => {
    const roleMap: Record<string, string> = {
      OWNER: 'At Sahibi',
      TRAINER: 'Trainer',
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

  const categoryOptions = useMemo(() => {
    const available = new Set<NoteCategory>()
    sortedNotes.forEach((note) => {
      if (note.category && NOTE_CATEGORIES.includes(note.category)) {
        available.add(note.category)
      }
    })
    return NOTE_CATEGORIES.filter((category) => available.has(category))
  }, [sortedNotes])

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

  const toggleCategoryFilter = (category: NoteCategory) => {
    setCategoryFilters((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  const clearFilters = () => {
    setSelectedRange(null)
    setAddedByFilters([])
    setCategoryFilters([])
  }

  const hasActiveFilters =
    !!selectedRange || addedByFilters.length > 0 || categoryFilters.length > 0

  const formatAddedBy = (note: Note) => {
    if (!note.addedBy) return '-'
    const roleLabel = ROLE_MAP[note.addedBy.role] || note.addedBy.role || ''
    const profileName =
      note.addedBy.ownerProfile?.officialName || note.addedBy.trainerProfile?.fullName || note.addedBy.name

    if (roleLabel && profileName) {
      return `${roleLabel} (${profileName})`
    }

    return roleLabel || profileName || 'Bilinmiyor'
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

  const openAttachmentViewer = (attachments: string[], startIndex = 0) => {
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
        // For now, use the first horse. In the future, we could show a selection dialog
        const firstHorse = data.horses[0]
        setSelectedHorseForAdd({ id: firstHorse.id, name: firstHorse.name })
        setIsAddModalOpen(true)
      } else {
        toast.error('Not eklemek için önce bir at eklemeniz gerekiyor')
      }
    } catch (error) {
      console.error('Fetch horses error:', error)
      toast.error('Atlar yüklenirken bir hata oluştu')
    }
  }

  const hasNotes = (notes?.length || 0) > 0
  const isEditModalVisible = isEditModalOpen && !!editingNote

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">{TR.common.loading}</p>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Filter and Add buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative filter-dropdown-container" ref={filterDropdownRef}>
            <Button
              variant="outline"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`border-2 font-medium px-4 h-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
                hasActiveFilters
                  ? 'border-[#6366f1] bg-indigo-50 text-[#6366f1]'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrele
              {hasActiveFilters && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#6366f1] text-white text-xs font-semibold">
                  {(selectedRange ? 1 : 0) + addedByFilters.length + categoryFilters.length}
                </span>
              )}
            </Button>

            {showFilterDropdown && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
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

                {/* Category Filter */}
                {categoryOptions.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Kategori</label>
                    <div className="flex flex-wrap gap-2">
                      {categoryOptions.map((category) => {
                        const isSelected = categoryFilters.includes(category)
                        return (
                          <button
                            key={category}
                            onClick={() => toggleCategoryFilter(category)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                              isSelected
                                ? 'bg-[#6366f1] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {category}
                          </button>
                        )
                      })}
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
              size="sm"
              onClick={() => setIsSearchOpen(true)}
              className="h-10 w-10 p-0 border-2 border-gray-300 hover:bg-gray-50"
            >
              <Search className="h-4 w-4 text-gray-600" />
            </Button>
          ) : (
            <div className="relative w-56">
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
            size="sm"
            onClick={handleAddNoteClick}
            className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-medium shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Not Ekle
          </Button>
        </div>
      </div>

      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg overflow-hidden w-full min-w-0">
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Kategori
                  </th>
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
                <tbody className="divide-y divide-gray-100">
                {!hasNotes ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-500">
                      Henüz not eklenmemiş
                    </td>
                  </tr>
                ) : filteredNotes.length === 0 ? (
                    <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                        Seçilen filtrelerde not bulunamadı
                      </td>
                    </tr>
                  ) : (
                  filteredNotes.map((note, index) => {
                    const isStriped = index % 2 === 1
                    const isHighlighted = highlightedNoteId === note.id
                    const attachments = getPhotoList(note.photoUrl)
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
                            : `${isStriped ? 'bg-gray-50/30' : ''} hover:bg-indigo-50/50`
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
                        <td className="px-4 py-3 whitespace-nowrap">
                          {note.category ? (
                            <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 px-2.5 py-0.5 text-xs font-semibold">
                              {note.category}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                          <td className="px-4 py-3">
                            {note.note ? (
                              <p className="text-sm text-gray-700">{note.note}</p>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{formatAddedBy(note)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-start gap-2">
                              {attachments.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openAttachmentViewer(attachments)}
                                  className="p-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors shadow-sm"
                                  title={`${attachments.length} ek görüntüle`}
                                >
                                  <Paperclip className="h-4 w-4" />
                                </button>
                              )}
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

      {/* Add Note Modal */}
      {selectedHorseForAdd && (
        <AddNoteModal
          open={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false)
            setSelectedHorseForAdd(null)
          }}
          horseId={selectedHorseForAdd.id}
          horseName={selectedHorseForAdd.name}
          onSuccess={() => {
            setIsAddModalOpen(false)
            setSelectedHorseForAdd(null)
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
            category: editingNote.category,
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

