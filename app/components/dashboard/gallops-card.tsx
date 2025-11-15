'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Activity } from 'lucide-react'
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

  useEffect(() => {
    fetchGallops()
  }, [])

  const fetchGallops = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('[GallopsCard] Fetching gallops')
      const response = await fetch('/api/dashboard/gallops')
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

  // Format jockey name to camel case
  const formatJockeyName = (name?: string): string => {
    if (!name) return ''
    
    // Check if name contains dots (initials format like F.S.M.SANSAR)
    if (name.includes('.')) {
      const parts = name.split('.')
      return parts.map((part, index) => {
        if (part.trim() === '') return '.' // Preserve dots
        
        // If it's a single letter (initial), keep uppercase
        if (part.length === 1) {
          return part.toUpperCase()
        }
        
        // If it's the last part, capitalize first letter and lowercase rest
        if (index === parts.length - 1) {
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        }
        
        // For other parts, keep uppercase if single letter, otherwise capitalize first
        return part.length === 1 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      }).join('.')
    }
    
    // No dots - split by space and capitalize each word (HACI DEMİR -> Hacı Demir)
    return name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
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

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-white shadow-lg border border-blue-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            {TR.dashboard.gallops}
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
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap flex-shrink-0 text-xs bg-gray-100 text-gray-700">
                          {gallop.date}
                        </span>
                        {gallop.jockeyName && (() => {
                          // Use surface color for jockey label
                          const jockeyColor = getSurfaceColor(gallop.surface)
                          const formattedJockeyName = formatJockeyName(gallop.jockeyName)
                          return (
                            <span
                              className="px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap flex-shrink-0 text-xs"
                              style={{ backgroundColor: jockeyColor.bg, color: jockeyColor.text }}
                            >
                              {formattedJockeyName}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                    {gallop.status && (
                      <div className="text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 px-2 py-0.5 rounded leading-tight flex items-center">
                        {gallop.status}
                      </div>
                    )}
                  </div>
                  {distanceEntries.length > 0 && (
                    <div className="mb-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <table className="text-xs border-collapse min-w-full">
                        <thead>
                          <tr>
                            {distanceEntries.map(({ distance }) => (
                              <th
                                key={distance}
                                className="px-2 py-1 text-center font-semibold text-gray-700 bg-gray-50 border border-gray-200 whitespace-nowrap"
                              >
                                {distance}m
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {distanceEntries.map(({ distance, time }) => (
                              <td
                                key={distance}
                                className="px-2 py-1 text-center font-medium text-indigo-700 bg-indigo-50 border border-gray-200 whitespace-nowrap"
                              >
                                {time}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  {gallop.racecourse && (
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap flex-shrink-0 bg-gray-100 text-gray-700">
                        {gallop.racecourse}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

