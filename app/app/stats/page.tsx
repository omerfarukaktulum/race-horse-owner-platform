'use client'

import { useState, useEffect } from 'react'
import { StatisticsCharts } from '@/app/components/horse-detail/StatisticsCharts'
import { toast } from 'sonner'

interface RaceHistory {
    id: string
  raceDate: string
  city?: string
  distance?: number
  surface?: string
  jockeyName?: string
  prizeMoney?: string
  raceType?: string
  position?: number
}

interface ExpenseData {
  date: string
  amount: string
}

export default function StatsPage() {
  const [races, setRaces] = useState<RaceHistory[]>([])
  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStatsData()
  }, [])

  const fetchStatsData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stats/all-data', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('İstatistikler yüklenemedi')
      }

      const data = await response.json()
      setRaces(data.races || [])
      setExpenses(data.expenses || [])
    } catch (error) {
      console.error('Fetch stats error:', error)
      toast.error('İstatistikler yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <StatisticsCharts races={races} expenses={expenses} />
  )
}
