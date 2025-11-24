'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { TurkishLira, ChevronDown } from 'lucide-react'
import { TR } from '@/lib/constants/tr'
import { useAuth } from '@/lib/context/auth-context'

interface ExpenseData {
  id: string
  horseId: string
  horseName: string
  date: string
  category: string
  customName?: string
  amount: string
  currency: string
  note?: string
  addedBy: string
  createdAt: string
  stablemate?: {        // Eküri info (only for trainers)
    id: string
    name: string
  }
}

interface NoteData {
  id: string
  horseId: string
  horseName: string
  date: string
  note: string
  addedBy: string
  createdAt?: string
  kiloValue?: number | null
  stablemate?: {        // Eküri info (only for trainers)
    id: string
    name: string
  }
}

type FeedItem =
  | { type: 'expense'; id: string; timestamp: number; expense: ExpenseData }
  | { type: 'note'; id: string; timestamp: number; note: NoteData }

export function RecentExpensesCard() {
  const router = useRouter()
  const { isTrainer } = useAuth()
  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [notes, setNotes] = useState<NoteData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showBottomFade, setShowBottomFade] = useState(false)

  const formatAddedBy = (addedBy?: {
    role?: string
    ownerProfile?: { officialName?: string }
    trainerProfile?: { fullName?: string }
  }) => {
    if (!addedBy) return '—'
    const roleLabel =
      (addedBy.role === 'OWNER'
        ? 'At Sahibi'
        : addedBy.role === 'TRAINER'
          ? 'Antrenör'
          : addedBy.role === 'GROOM'
            ? 'Groom'
            : addedBy.role) || ''

    const profileName =
      addedBy.ownerProfile?.officialName ||
      addedBy.trainerProfile?.fullName ||
      ''

    if (roleLabel && profileName) {
      return `${roleLabel} (${profileName})`
    }

    return roleLabel || profileName || '—'
  }

  useEffect(() => {
    let isMounted = true

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [expensesResponse, notesResponse] = await Promise.all([
          fetch('/api/dashboard/recent-expenses?limit=10'),
          fetch('/api/notes?limit=10'),
        ])

        if (!expensesResponse.ok) {
          const errorData = await expensesResponse.json().catch(() => ({}))
          console.error('[RecentExpensesCard] Expenses error response:', errorData)
          throw new Error('Failed to fetch expenses')
        }

        if (!notesResponse.ok) {
          const errorData = await notesResponse.json().catch(() => ({}))
          console.error('[RecentExpensesCard] Notes error response:', errorData)
          throw new Error('Failed to fetch notes')
        }

        const [expensesData, notesData] = await Promise.all([
          expensesResponse.json(),
          notesResponse.json(),
        ])

        if (!isMounted) return

        setExpenses(expensesData.expenses || [])
        setNotes(
          (notesData.notes || []).map((note: any) => ({
            id: note.id,
            horseId: note.horse?.id || '',
            horseName: note.horse?.name || '—',
            date: note.date,
            note: note.note,
            kiloValue: note.kiloValue,
            addedBy: formatAddedBy(note.addedBy),
            createdAt: note.createdAt,
            stablemate: note.horse?.stablemate ? {
              id: note.horse.stablemate.id,
              name: note.horse.stablemate.name,
            } : undefined,
          }))
        )
      } catch (err) {
        console.error('[RecentExpensesCard] Error fetching dashboard data:', err)
        if (isMounted) {
          setError('Veriler yüklenirken hata oluştu')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchDashboardData()

    return () => {
      isMounted = false
    }
  }, [])

  const formatDateWithTime = (dateStr: string, createdAtStr?: string) => {
    try {
      const date = new Date(dateStr)
      const dateFormatted = date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      
      // Try to get time from the date field first
      let timeStr = ''
      const dateObj = new Date(dateStr)
      const hours = dateObj.getHours()
      const minutes = dateObj.getMinutes()
      
      // Check if time is meaningful (not midnight or if createdAt has different time)
      if (hours !== 0 || minutes !== 0) {
        timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      } else if (createdAtStr) {
        // Fallback to createdAt time if date doesn't have time
        const createdAt = new Date(createdAtStr)
        const createdHours = createdAt.getHours()
        const createdMinutes = createdAt.getMinutes()
        timeStr = `${String(createdHours).padStart(2, '0')}:${String(createdMinutes).padStart(2, '0')}`
      }
      
      return timeStr ? `${dateFormatted} • ${timeStr}` : dateFormatted
    } catch {
      return dateStr
    }
  }

  const getCategoryName = (category: string) => {
    return TR.expenseCategories[category as keyof typeof TR.expenseCategories] || category
  }

  const formatNotePreview = (text?: string) => {
    if (!text) return 'Not detayları bulunamadı'
    return text.length > 110 ? `${text.slice(0, 110)}…` : text
  }

  const combinedItems = useMemo<FeedItem[]>(() => {
    const expenseItems = expenses.map((expense) => {
      const timestamp = new Date(expense.date || expense.createdAt).getTime()
      return {
        type: 'expense' as const,
        id: `expense-${expense.id}`,
        timestamp,
        expense,
      }
    })

    const noteItems = notes.map((note) => {
      const timestamp = new Date(note.date || note.createdAt || note.date).getTime()
      return {
        type: 'note' as const,
        id: `note-${note.id}`,
        timestamp,
        note,
      }
    })

    return [...expenseItems, ...noteItems].sort((a, b) => b.timestamp - a.timestamp)
  }, [expenses, notes])

  useEffect(() => {
    const checkScrollability = () => {
      if (scrollRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = scrollRef.current
        const canScroll = scrollHeight > clientHeight
        setShowBottomFade(canScroll && scrollTop + clientHeight < scrollHeight - 5)
      }
    }

    checkScrollability()

    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = scrollRef.current
        setShowBottomFade(scrollTop + clientHeight < scrollHeight - 5)
      }
    }

    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll)

      const resizeObserver = new ResizeObserver(() => {
        checkScrollability()
      })
      resizeObserver.observe(scrollElement)

      const timeout = setTimeout(checkScrollability, 100)

      return () => {
        scrollElement.removeEventListener('scroll', handleScroll)
        resizeObserver.disconnect()
        clearTimeout(timeout)
      }
    }
  }, [combinedItems.length])

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-white shadow-lg border border-blue-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TurkishLira className="h-5 w-5 text-indigo-600" />
            {TR.dashboard.recentExpenses}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col p-6 pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-500 text-sm">
            {error}
          </div>
        ) : combinedItems.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
            {TR.dashboard.noData}
          </div>
        ) : (
          <div className="relative">
            <div 
              ref={scrollRef}
              className="overflow-y-auto space-y-3 -mx-6 px-6" 
              style={{ maxHeight: '600px' }}
            >
              {combinedItems.map((item) => {
                const isExpense = item.type === 'expense'
                const labelClasses = isExpense
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'

                const handleNavigate = () => {
                  if (isExpense) {
                    router.push(
                      `/app/horses/${item.expense.horseId}?tab=expenses&highlightExpense=${item.expense.id}`
                    )
                    return
                  }

                  router.push(`/app/notes?highlightNote=${item.note.id}`)
                }

                const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleNavigate()
                  }
                }

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={handleNavigate}
                    onKeyDown={handleKeyDown}
                    className="p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-white"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-semibold text-gray-900 text-sm">
                        {isExpense ? item.expense.horseName : item.note.horseName}
                      </p>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded leading-tight flex items-center ${labelClasses}`}
                      >
                        {isExpense ? 'Gider' : 'Not'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mb-1">
                      📅{' '}
                      {formatDateWithTime(
                        isExpense ? item.expense.date : item.note.date,
                        isExpense ? item.expense.createdAt : item.note.createdAt
                      )}
                    </p>

                    {isExpense ? (
                      <>
                        <p className="text-xs text-gray-600 mb-1">
                          🏷️ {item.expense.customName || getCategoryName(item.expense.category)}
                        </p>
                        <p className="text-xs text-red-600 font-medium">
                          💰 {parseFloat(item.expense.amount).toLocaleString('tr-TR')} TL
                        </p>
                        {isTrainer && item.expense.stablemate && (
                          <div className="text-xs text-gray-500 mt-2">
                            🏢 Eküri: {item.expense.stablemate.name}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                          📝 {formatNotePreview(item.note.note)}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          👤 {item.note.addedBy}
                        </p>
                        {isTrainer && item.note.stablemate && (
                          <div className="text-xs text-gray-500 mt-2">
                            🏢 Eküri: {item.note.stablemate.name}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            {/* Bottom fade gradient and scroll indicator */}
            {showBottomFade && (
              <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-10">
                <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/70 to-transparent" />
                <div className="relative flex items-center justify-center gap-1.5 pt-2">
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 animate-bounce" />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

