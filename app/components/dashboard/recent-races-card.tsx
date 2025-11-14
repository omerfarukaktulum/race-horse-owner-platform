'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Trophy } from 'lucide-react'
import { TR } from '@/lib/constants/tr'

interface RaceData {
  date: string          // Race date (DD.MM.YYYY)
  horseName: string     // Horse name
  city: string          // City
  distance?: number     // Distance in meters
  surface?: string      // Surface type (Pist)
  position?: number     // Finish position
  raceType?: string     // Race type (Kcins)
  prizeMoney?: string   // Prize money (İkramiye)
}

export function RecentRacesCard() {
  const [races, setRaces] = useState<RaceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRaces()
  }, [])

  const fetchRaces = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('[RecentRacesCard] Fetching races...')
      const response = await fetch('/api/dashboard/recent-races?limit=10')
      console.log('[RecentRacesCard] Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[RecentRacesCard] Error response:', errorData)
        throw new Error('Failed to fetch races')
      }

      const data = await response.json()
      console.log('[RecentRacesCard] Data received:', data)
      setRaces(data.races || [])
    } catch (err) {
      console.error('[RecentRacesCard] Error fetching races:', err)
      setError('Yarışlar yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  // Date is already in DD.MM.YYYY format from TJK
  const formatRaceDate = (dateStr: string) => {
    return dateStr
  }

  const getPositionBadgeColor = (position?: number) => {
    if (!position) return 'bg-gray-100 text-gray-700'
    if (position === 1) return 'bg-yellow-100 text-yellow-700'
    if (position === 2) return 'bg-gray-200 text-gray-700'
    if (position === 3) return 'bg-amber-100 text-amber-700'
    return 'bg-gray-100 text-gray-700'
  }

  // Get surface color based on TJK official colors
  const getSurfaceColor = (surface?: string): { bg: string; text: string } => {
    if (!surface) return { bg: '#f3f4f6', text: '#374151' }
    
    const surfaceLower = surface.toLowerCase()
    if (surfaceLower.includes('kum') || surfaceLower.startsWith('k:')) {
      return { bg: '#996633', text: '#ffffff' }
    } else if (surfaceLower.includes('çim') || surfaceLower.startsWith('ç:')) {
      return { bg: '#009900', text: '#ffffff' }
    } else if (surfaceLower.includes('sentetik') || surfaceLower.startsWith('s:')) {
      return { bg: '#d39b1e', text: '#ffffff' }
    }
    return { bg: '#f3f4f6', text: '#374151' }
  }

  // Get city color - fixed grayish color for all cities
  const getCityColor = (city?: string): { bg: string; text: string } => {
    if (!city) return { bg: '#f3f4f6', text: '#374151' }
    
    // Fixed grayish color for all cities
    return { bg: '#6b7280', text: '#ffffff' }
  }

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-white shadow-lg border border-blue-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-indigo-600" />
            {TR.dashboard.recentRaces}
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
        ) : races.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
            {TR.dashboard.noData}
          </div>
        ) : (
          <div className="overflow-y-auto space-y-3 pr-2" style={{ maxHeight: '300px' }}>
            {races.map((race, index) => (
              <div
                key={`${race.horseName}-${race.date}-${index}`}
                className="p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      {race.horseName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatRaceDate(race.date)}
                    </p>
                  </div>
                  {race.position !== undefined && race.position > 0 && (
                    <div className={`text-xs font-bold px-2 py-1 rounded ${getPositionBadgeColor(race.position)}`}>
                      {race.position}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs mb-2 flex-nowrap overflow-x-auto">
                  {race.city && (() => {
                    const cityColor = getCityColor(race.city)
                    return (
                      <span
                        className="px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: cityColor.bg, color: cityColor.text }}
                      >
                        {race.city}
                      </span>
                    )
                  })()}
                  {race.raceType && (
                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-md font-medium whitespace-nowrap flex-shrink-0">
                      {race.raceType}
                    </span>
                  )}
                  {race.distance && race.surface && (() => {
                    const surfaceColor = getSurfaceColor(race.surface)
                    return (
                      <span
                        className="px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: surfaceColor.bg, color: surfaceColor.text }}
                      >
                        {race.distance}
                      </span>
                    )
                  })()}
                </div>
                {race.prizeMoney && parseFloat(race.prizeMoney) > 0 && (
                  <div className="text-xs text-green-600 font-medium">
                    💰 {parseFloat(race.prizeMoney).toLocaleString('tr-TR')} TL
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

