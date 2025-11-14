'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { TurkishLira } from 'lucide-react'
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
  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchExpenses()
  }, [])

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

  const formatExpenseDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
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
      <CardContent className="flex-1 overflow-hidden flex flex-col">
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
          <div className="overflow-y-auto space-y-3 pr-2" style={{ maxHeight: '300px' }}>
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      {expense.horseName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatExpenseDate(expense.date)}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-red-600">
                    {parseFloat(expense.amount).toLocaleString('tr-TR')} {expense.currency}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md font-medium">
                    {expense.customName || getCategoryName(expense.category)}
                  </span>
                </div>
                {expense.note && (
                  <div className="mt-2 text-xs text-gray-600 italic line-clamp-2">
                    {expense.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

