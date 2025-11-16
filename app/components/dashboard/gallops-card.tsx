'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Activity } from 'lucide-react'
import { TR } from '@/lib/constants/tr'

interface GallopData {
  date: string
  distances: { [distance: number]: string }  // All distances with times
  status?: string
  racecourse?: string  // İ. Hip. - contains city name like "Adana"
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

  // Format status abbreviations to full Turkish words
  const formatStatus = (status?: string): string => {
    if (!status) return ''
    
    // Replace abbreviations with full Turkish words
    if (status.trim() === 'R') {
      return 'Rahat'
    } else if (status.trim() === 'ÇR') {
      return 'Çok Rahat'
    } else if (status.trim() === 'Ç') {
      return 'Çalışarak'
    } else if (status.trim() === 'HÇ') {
      return 'Hafif Çalışarak'
    }
    
    return status
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
      <CardContent className="flex-1 overflow-hidden flex flex-col p-6 pt-0">
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
          <div className="overflow-y-auto space-y-3 -mx-6 px-6" style={{ maxHeight: '300px' }}>
            {gallops.map((gallop, index) => {
              const distanceEntries = Object.entries(gallop.distances || {})
                .map(([dist, time]) => ({ distance: parseInt(dist), time }))
                .sort((a, b) => b.distance - a.distance) // Sort by distance descending
              
              return (
                <div
                  key={`${gallop.horseId}-${gallop.date}-${index}`}
                  className="p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                >
                  {/* Design with text and emojis */}
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm mb-1">
                        {gallop.horseName}
                      </p>
                    </div>
                    {gallop.status && (
                      <div className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 leading-tight flex items-center">
                        {formatStatus(gallop.status)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    📅 {gallop.date}
                    {gallop.racecourse && ` • 📍 ${gallop.racecourse}`}
                  </p>
                  {(gallop.jockeyName || gallop.surface) && (
                    <p className="text-xs text-gray-600 mb-2">
                      {gallop.jockeyName && `👤 ${formatJockeyName(gallop.jockeyName)}`}
                      {gallop.jockeyName && gallop.surface && ` • `}
                      {gallop.surface && (() => {
                        // Extract only the surface type (Kum, Çim, Sentetik) from formats like "K:Normal", "Ç:Çok Yumuşak 3.9", etc.
                        const surface = gallop.surface
                        if (surface.startsWith('K:') || surface.toLowerCase().includes('kum')) {
                          return 'Kum'
                        } else if (surface.startsWith('Ç:') || surface.toLowerCase().includes('çim')) {
                          return 'Çim'
                        } else if (surface.toLowerCase().includes('sentetik')) {
                          return 'Sentetik'
                        }
                        return surface.split(':')[0].split(' ')[0]
                      })()}
                    </p>
                  )}
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
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

