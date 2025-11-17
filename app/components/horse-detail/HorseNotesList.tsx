'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Filter, Pencil, Trash2, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { formatDateShort } from '@/lib/utils/format'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'
import { AddNoteModal } from '@/app/components/modals/add-note-modal'
import { toast } from 'sonner'

interface HorseNote {
  id: string
  date: string
  note: string
  photoUrl?: string | string[]
  addedBy: {
    email: string
    role: string
  }
}

interface Props {
  notes: HorseNote[]
  horseId: string
  horseName: string
  onRefresh?: () => void
  hideButtons?: boolean
  onFilterTriggerReady?: (trigger: () => void) => void
}

const ROLE_MAP: Record<string, string> = {
  OWNER: 'Horse Owner',
  TRAINER: 'Trainer',
  GROOM: 'Groom',
}

type RangeKey = 'lastWeek' | 'lastMonth' | 'last3Months' | 'thisYear'

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'lastWeek', label: 'Son 1 Hafta' },
  { value: 'lastMonth', label: 'Son 1 Ay' },
  { value: 'last3Months', label: 'Son 3 Ay' },
  { value: 'thisYear', label: 'Bu Yıl' },
]

function getPhotoList(photoUrl?: string | string[]) {
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

function formatAddedBy(note: HorseNote) {
  if (!note.addedBy) return '-'
  const roleLabel = ROLE_MAP[note.addedBy.role] || note.addedBy.role || ''
  return roleLabel
    ? `${roleLabel}${note.addedBy.email ? ` (${note.addedBy.email})` : ''}`
    : note.addedBy.email || '-'
}

export function HorseNotesList({ notes, horseId, horseName, onRefresh, hideButtons = false, onFilterTriggerReady }: Props) {
  const [selectedRange, setSelectedRange] = useState<RangeKey | null>(null)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  
  // Expose filter trigger to parent
  useEffect(() => {
    if (onFilterTriggerReady) {
      onFilterTriggerReady(() => {
        setShowFilterDropdown(prev => !prev)
      })
    }
  }, [onFilterTriggerReady])
  const [editingNote, setEditingNote] = useState<HorseNote | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<HorseNote | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [attachmentViewer, setAttachmentViewer] = useState<{
    open: boolean
    attachments: string[]
    currentIndex: number
  }>({
    open: false,
    attachments: [],
    currentIndex: 0,
  })

  const hasNotes = (notes?.length || 0) > 0

  useEffect(() => {
    if (!showFilterDropdown) return
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
    return [...(notes || [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [notes])

  const filteredNotes = useMemo(() => {
    if (!selectedRange) return sortedNotes

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

    if (!startDate) return sortedNotes

    return sortedNotes.filter((note) => {
      const noteDate = new Date(note.date)
      return noteDate >= startDate
    })
  }, [selectedRange, sortedNotes])

  const handleEditClick = (note: HorseNote) => {
    setEditingNote(note)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (note: HorseNote) => {
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
      onRefresh?.()
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

  const isEditModalVisible = isEditModalOpen && !!editingNote

  return (
    <>
      <div className="space-y-4">
      {/* Filter dropdown container - always rendered for dropdown positioning */}
      <div 
        className="relative filter-dropdown-container"
        ref={filterDropdownRef}
        style={{ visibility: hideButtons ? 'hidden' : 'visible', position: hideButtons ? 'absolute' : 'relative' }}
      >
        {!hideButtons && (
          <Button
            variant="outline"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`border-2 font-medium px-4 h-10 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
              !!selectedRange
                ? 'border-[#6366f1] bg-indigo-50 text-[#6366f1]'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtrele
            {selectedRange && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#6366f1] text-white text-xs font-semibold">
                1
              </span>
            )}
          </Button>
        )}

        {showFilterDropdown && (
          <div className={`absolute ${hideButtons ? 'fixed' : ''} left-0 top-full mt-2 w-fit min-w-[200px] bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">Filtreler</h3>
              <button
                onClick={() => setShowFilterDropdown(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {RANGE_OPTIONS.map((option) => {
                const isActive = selectedRange === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      const nextValue = isActive ? null : option.value
                      setSelectedRange(nextValue)
                      setShowFilterDropdown(false)
                    }}
                    className={`w-[140px] text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#6366f1] text-white shadow'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            {selectedRange && (
              <button
                onClick={() => {
                  setSelectedRange(null)
                  setShowFilterDropdown(false)
                }}
                className="mt-4 w-full text-sm text-[#6366f1] font-medium hover:underline"
              >
                Filtreyi Temizle
              </button>
            )}
          </div>
        )}
      </div>

        <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg overflow-hidden">
          <CardContent className={hasNotes ? 'p-0' : 'py-16 text-center'}>
            {!hasNotes ? (
              <p className="text-gray-500">Henüz not eklenmemiş</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Tarih
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Not
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Ekleyen
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredNotes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                          Seçilen tarih aralığında not bulunamadı
                        </td>
                      </tr>
                    ) : (
                      filteredNotes.map((note, index) => {
                        const isStriped = index % 2 === 1
                        const attachments = getPhotoList(note.photoUrl)
                        return (
                          <tr
                            key={note.id}
                            className={`transition-colors hover:bg-indigo-50/50 ${
                              isStriped ? 'bg-gray-50/30' : ''
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">
                                {formatDateShort(note.date)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-800">
                                {note.note ? note.note.replace(/\s*\n+\s*/g, ' ').trim() : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-700">{formatAddedBy(note)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                {attachments.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => openAttachmentViewer(attachments)}
                                    className="p-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors shadow-sm"
                                    title={`${attachments.length} ek görüntüle`}
                                  >
                                    <Eye className="h-4 w-4" />
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
            )}
          </CardContent>
        </Card>
      </div>

      <AddNoteModal
        open={isEditModalVisible}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingNote(null)
        }}
        horseId={horseId}
        horseName={horseName}
        onSuccess={() => {
          setIsEditModalOpen(false)
          setEditingNote(null)
          onRefresh?.()
        }}
        mode="edit"
        noteId={editingNote?.id}
        initialNote={
          editingNote
            ? {
                date: editingNote.date,
                note: editingNote.note,
                photoUrl: editingNote.photoUrl,
              }
            : undefined
        }
        submitLabel="Notu Kaydet"
      />

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
              {isDeleting ? 'Siliniyor...' : 'Sil'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  )
}

