'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Activity, ChevronDown } from 'lucide-react'
import { TR } from '@/lib/constants/tr'

interface GallopData {
  date: string
  distances: { [distance: number]: string }  // All distances with times
  status?: string
  racecourse?: string
  surface?: string
  jockeyName?: string
  horseId: string
  horseName: string
}

export function GallopsCard() {
  const [gallops, setGallops] = useState<GallopData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(7)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    fetchGallops()
  }, [days])

  const fetchGallops = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('[GallopsCard] Fetching gallops for days:', days)
      const response = await fetch(`/api/dashboard/gallops?days=${days}`)
      console.log('[GallopsCard] Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[GallopsCard] Error response:', errorData)
        throw new Error('Failed to fetch gallops')
      }

      const data = await response.json()
      console.log('[GallopsCard] Data received:', data)
      setGallops(data.gallops || [])
    } catch (err) {
      console.error('[GallopsCard] Error fetching gallops:', err)
      setError('İdmanlar yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const dayOptions = [7, 14, 30]

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

  // Get jockey color - fixed red color
  const getJockeyColor = (): { bg: string; text: string } => {
    return { bg: '#FF4F4F', text: '#ffffff' }
  }

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-white shadow-lg border border-blue-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            {TR.dashboard.gallops}
          </CardTitle>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Son {days} Gün
              <ChevronDown className="h-3 w-3" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                {dayOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setDays(option)
                      setDropdownOpen(false)
                    }}
                    className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                      days === option ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    Son {option} Gün
                  </button>
                ))}
              </div>
            )}
          </div>
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
        ) : gallops.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
            {TR.dashboard.noData}
          </div>
        ) : (
          <div className="overflow-y-auto space-y-3 pr-2" style={{ maxHeight: '300px' }}>
            {gallops.map((gallop, index) => {
              const distanceEntries = Object.entries(gallop.distances || {})
                .map(([dist, time]) => ({ distance: parseInt(dist), time }))
                .sort((a, b) => b.distance - a.distance) // Sort by distance descending
              
              return (
                <div
                  key={`${gallop.horseId}-${gallop.date}-${index}`}
                  className="p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">
                        {gallop.horseName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {gallop.date}
                      </p>
                    </div>
                    {gallop.status && (
                      <div className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {gallop.status}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs mb-2">
                    {distanceEntries.map(({ distance, time }) => (
                      <span
                        key={distance}
                        className="px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}
                      >
                        {distance}m: {time}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {gallop.racecourse && (
                      <span className="px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap flex-shrink-0 bg-gray-100 text-gray-700">
                        {gallop.racecourse}
                      </span>
                    )}
                    {gallop.surface && (() => {
                      const surfaceColor = getSurfaceColor(gallop.surface)
                      return (
                        <span
                          className="px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap flex-shrink-0"
                          style={{ backgroundColor: surfaceColor.bg, color: surfaceColor.text }}
                        >
                          {gallop.surface}
                        </span>
                      )
                    })()}
                    {gallop.jockeyName && (() => {
                      const jockeyColor = getJockeyColor()
                      return (
                        <span
                          className="px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap flex-shrink-0"
                          style={{ backgroundColor: jockeyColor.bg, color: jockeyColor.text }}
                        >
                          {gallop.jockeyName}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

