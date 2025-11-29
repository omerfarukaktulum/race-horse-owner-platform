'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Calendar, ChevronDown } from 'lucide-react'
import { TR } from '@/lib/constants/tr'
import { formatDate } from '@/lib/utils/format'
import { useAuth } from '@/lib/context/auth-context'

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
  tjkUrl?: string
  stablemate?: {        // Eküri info (only for trainers)
    id: string
    name: string
  }
}

export function RegistrationsCard() {
  const { isTrainer } = useAuth()
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showBottomFade, setShowBottomFade] = useState(false)

  useEffect(() => {
    fetchRegistrations()
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
  }, [registrations.length])

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
      <CardContent className="flex-1 overflow-hidden flex flex-col p-6 pt-0">
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
          <div className="relative">
            <div 
              ref={scrollRef}
              className="overflow-y-auto space-y-3 -mx-6 px-6" 
              style={{ maxHeight: '280px' }}
            >
              {registrations.map((registration) => (
              <div
                key={registration.id}
                role={registration.tjkUrl ? 'button' : undefined}
                tabIndex={registration.tjkUrl ? 0 : -1}
                onClick={() => {
                  if (registration.tjkUrl) {
                    window.open(registration.tjkUrl, '_blank', 'noopener')
                  }
                }}
                onKeyDown={(event) => {
                  if (!registration.tjkUrl) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    window.open(registration.tjkUrl, '_blank', 'noopener')
                  }
                }}
                className={`p-3 bg-white rounded-lg border border-gray-200 transition-all duration-200 ${
                  registration.tjkUrl ? 'hover:border-indigo-300 hover:shadow-md cursor-pointer' : ''
                }`}
              >
                {/* Design with text and emojis */}
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm mb-1">
                      {registration.horseName}
                    </p>
                  </div>
                  <div
                    className="text-xs font-medium px-2 py-0.5 rounded leading-tight flex items-center bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    {registration.type === 'KAYIT' ? TR.dashboard.kayit : TR.dashboard.deklare}
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  📅 {formatRaceDate(registration.raceDate)}
                  {registration.city && ` • 📍 ${registration.city}`}
                </p>
                <div className="text-xs text-gray-600 mb-2">
                  {registration.raceType && `🏁 ${registration.raceType}`}
                  {registration.raceType && registration.distance && ` • `}
                  {registration.distance && `${registration.distance}`}
                  {registration.distance && registration.surface && ` • `}
                  {registration.surface && (() => {
                    // Extract only the surface type (Kum, Çim, Sen) from formats like "K:Normal", "Ç:Çok Yumuşak 3.9", "S:Normal", etc.
                    const surface = registration.surface
                    if (surface.startsWith('K:') || surface.toLowerCase().includes('kum')) {
                      return 'Kum'
                    } else if (surface.startsWith('Ç:') || surface.toLowerCase().includes('çim')) {
                      return 'Çim'
                    } else if (surface.startsWith('S:') || surface.toLowerCase().includes('sentetik')) {
                      return 'Sen'
                    }
                    // If it's just the type without prefix, return as is
                    return surface.split(':')[0].split(' ')[0]
                  })()}
                </div>
                {registration.jockeyName && (
                  <div className="text-xs text-gray-600 mb-2">
                    👤 {formatJockeyName(registration.jockeyName)}
                  </div>
                )}
                {isTrainer && registration.stablemate && (
                  <div className="text-xs text-gray-500 mt-2">
                    🏢 Eküri: {registration.stablemate.name}
                  </div>
                )}
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

