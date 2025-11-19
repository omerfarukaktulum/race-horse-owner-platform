'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { TurkishLira, ChevronDown } from 'lucide-react'
import { TR } from '@/lib/constants/tr'

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
}

export function RecentExpensesCard() {
  const router = useRouter()
  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showBottomFade, setShowBottomFade] = useState(false)

  useEffect(() => {
    fetchExpenses()
  }, [])

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
  }, [expenses.length])

  const fetchExpenses = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('[RecentExpensesCard] Fetching expenses...')
      const response = await fetch('/api/dashboard/recent-expenses?limit=10')
      console.log('[RecentExpensesCard] Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[RecentExpensesCard] Error response:', errorData)
        throw new Error('Failed to fetch expenses')
      }

      const data = await response.json()
      console.log('[RecentExpensesCard] Data received:', data)
      setExpenses(data.expenses || [])
    } catch (err) {
      console.error('[RecentExpensesCard] Error fetching expenses:', err)
      setError('Giderler yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const formatExpenseDate = (dateStr: string, createdAtStr?: string) => {
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
        ) : expenses.length === 0 ? (
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
              {expenses.map((expense) => (
              <div
                key={expense.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  router.push(`/app/horses/${expense.horseId}?tab=expenses&highlightExpense=${expense.id}`)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    router.push(`/app/horses/${expense.horseId}?tab=expenses&highlightExpense=${expense.id}`)
                  }
                }}
                className="p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                {/* 1st line: Horse name */}
                <p className="font-semibold text-gray-900 text-sm mb-1">
                  {expense.horseName}
                </p>
                
                {/* 2nd line: Date */}
                <p className="text-xs text-gray-600 mb-1">
                  📅 {formatExpenseDate(expense.date, expense.createdAt)}
                </p>
                
                {/* 3rd line: Category */}
                <p className="text-xs text-gray-600 mb-1">
                  🏷️ {expense.customName || getCategoryName(expense.category)}
                </p>
                
                {/* 4th line: amount */}
                <p className="text-xs text-red-600 font-medium">
                  💰 {parseFloat(expense.amount).toLocaleString('tr-TR')} TL
                </p>
              </div>
            ))}
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

