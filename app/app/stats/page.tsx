'use client'

import { useState, useEffect } from 'react'
import { StatisticsCharts } from '@/app/components/horse-detail/StatisticsCharts'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'

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
  horseId?: string
  horseName?: string
  horse?: {
    id: string
    name: string
    stablemate?: {
      id: string
      name: string
    } | null
  }
}

interface ExpenseData {
  date: string
  amount: string
  horseId?: string
  horseName?: string
  category?: string
  horse?: {
    id: string
    name: string
    stablemate?: {
      id: string
      name: string
    } | null
  }
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
          </div>
          <p className="text-gray-900 font-bold text-lg">{TR.common.loading}</p>
          <p className="text-sm text-gray-600 mt-2">İstatistikler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return <StatisticsCharts races={races} expenses={expenses} isGlobalStats />
}
