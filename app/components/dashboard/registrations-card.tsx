'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Calendar } from 'lucide-react'
import { TR } from '@/lib/constants/tr'
import { formatDate } from '@/lib/utils/format'

interface RegistrationItem {
  id: string
  horseName: string
  raceDate: string      // Date in DD.MM.YYYY format
  city?: string
  distance?: number
  surface?: string
  raceType?: string
  type: 'KAYIT' | 'DEKLARE'
  jockeyName?: string   // Jockey name for declarations
}

export function RegistrationsCard() {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRegistrations()
  }, [])

  const fetchRegistrations = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('[RegistrationsCard] Fetching registrations...')
      const response = await fetch('/api/dashboard/registrations')
      console.log('[RegistrationsCard] Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[RegistrationsCard] Error response:', errorData)
        throw new Error('Failed to fetch registrations')
      }

      const data = await response.json()
      console.log('[RegistrationsCard] Data received:', data)
      setRegistrations(data.registrations || [])
    } catch (err) {
      console.error('[RegistrationsCard] Error fetching registrations:', err)
      setError('Kayıtlar yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  // Date is already in DD.MM.YYYY format from TJK
  const formatRaceDate = (dateStr: string) => {
    return dateStr
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

  // Get jockey color - fixed color for all jockeys (different from city)
  const getJockeyColor = (): { bg: string; text: string } => {
    // Fixed teal/cyan color for jockeys
    return { bg: '#FF4F4F', text: '#ffffff' }
  }

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-white shadow-lg border border-blue-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            {TR.dashboard.registrations}
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
        ) : registrations.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
            {TR.dashboard.noData}
          </div>
        ) : (
          <div className="overflow-y-auto space-y-3 pr-2" style={{ maxHeight: '300px' }}>
            {registrations.map((registration) => (
              <div
                key={registration.id}
                className="p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      {registration.horseName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatRaceDate(registration.raceDate)}
                    </p>
                  </div>
                  <Badge
                    variant={registration.type === 'KAYIT' ? 'default' : 'secondary'}
                    className={
                      registration.type === 'KAYIT'
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }
                  >
                    {registration.type === 'KAYIT' ? TR.dashboard.kayit : TR.dashboard.deklare}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs mb-2 flex-nowrap overflow-x-auto">
                  {registration.city && (() => {
                    const cityColor = getCityColor(registration.city)
                    return (
                      <span
                        className="px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: cityColor.bg, color: cityColor.text }}
                      >
                        {registration.city}
                      </span>
                    )
                  })()}
                  {registration.raceType && (
                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-md font-medium whitespace-nowrap flex-shrink-0">
                      {registration.raceType}
                    </span>
                  )}
                  {registration.distance && registration.surface && (() => {
                    const surfaceColor = getSurfaceColor(registration.surface)
                    return (
                      <span
                        className="px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: surfaceColor.bg, color: surfaceColor.text }}
                      >
                        {registration.distance}
                      </span>
                    )
                  })()}
                </div>
                {registration.jockeyName && (() => {
                  const jockeyColor = getJockeyColor()
                  return (
                    <div className="text-xs">
                      <span
                        className="px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap inline-block"
                        style={{ backgroundColor: jockeyColor.bg, color: jockeyColor.text }}
                      >
                        {registration.jockeyName}
                      </span>
                    </div>
                  )
                })()}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

