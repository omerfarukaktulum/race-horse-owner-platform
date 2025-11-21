'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Activity, ChevronDown } from 'lucide-react'
import { TR } from '@/lib/constants/tr'
import { formatGallopStatus } from '@/lib/utils/gallops'
import { useAuth } from '@/lib/context/auth-context'

interface GallopData {
  id: string
  date: string
  distances: { [distance: number]: string }  // All distances with times
  status?: string
  racecourse?: string  // İ. Hip. - contains city name like "Adana"
  surface?: string
  jockeyName?: string
  horseId: string
  horseName: string
  stablemate?: {        // Eküri info (only for trainers)
    id: string
    name: string
  }
}

export function GallopsCard() {
  const router = useRouter()
  const { isTrainer } = useAuth()
  const [gallops, setGallops] = useState<GallopData[]>([])
  const [visitedGallops, setVisitedGallops] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showBottomFade, setShowBottomFade] = useState(false)

  useEffect(() => {
    fetchGallops()
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
  }, [gallops.length])

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
    const words = name.split(' ').filter(word => word.trim() !== '')
    
    // If 4 or more words, abbreviate first two words (if each has at least 3 characters)
    if (words.length >= 4) {
      const firstWord = words[0]
      const secondWord = words[1]
      const restWords = words.slice(2)
      
      let formattedWords: string[] = []
      
      // Abbreviate first word only if it has at least 3 characters
      if (firstWord.length >= 3) {
        formattedWords.push(firstWord.charAt(0).toUpperCase() + '.')
      } else {
        formattedWords.push(firstWord.charAt(0).toUpperCase() + (firstWord.length > 1 ? firstWord.slice(1).toLowerCase() : ''))
      }
      
      // Abbreviate second word only if it has at least 3 characters
      if (secondWord.length >= 3) {
        formattedWords.push(secondWord.charAt(0).toUpperCase() + '.')
      } else {
        formattedWords.push(secondWord.charAt(0).toUpperCase() + (secondWord.length > 1 ? secondWord.slice(1).toLowerCase() : ''))
      }
      
      // Add the rest of the words with proper capitalization
      const formattedRest = restWords.map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      
      return [...formattedWords, ...formattedRest].join(' ')
    }
    
    // 4 words or less - capitalize each word normally
    return words.map(word => 
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
    <Card className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-blue-50 to-white shadow-lg border border-indigo-100">
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
          <div className="relative">
            <div 
              ref={scrollRef}
              className="overflow-y-auto space-y-3 -mx-6 px-6" 
              style={{ maxHeight: '600px' }}
            >
            {gallops.map((gallop, index) => {
              const distanceEntries = Object.entries(gallop.distances || {})
                .map(([dist, time]) => ({ distance: parseInt(dist), time }))
                .sort((a, b) => a.distance - b.distance) // Sort by distance ascending
              
              return (
                <div
                  key={`${gallop.id}-${index}`}
                  role="button"
                  tabIndex={0}
                onClick={() => {
                    setVisitedGallops((prev) =>
                      prev.includes(gallop.id) ? prev : [...prev, gallop.id]
                    )
                    router.push(`/app/horses/${gallop.horseId}?tab=gallops&highlightGallop=${gallop.id}`)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setVisitedGallops((prev) =>
                        prev.includes(gallop.id) ? prev : [...prev, gallop.id]
                      )
                      router.push(`/app/horses/${gallop.horseId}?tab=gallops&highlightGallop=${gallop.id}`)
                    }
                  }}
                  className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer relative ${
                    visitedGallops.includes(gallop.id)
                      ? 'bg-gradient-to-r from-indigo-50 via-white to-white border-indigo-400 shadow-lg ring-2 ring-indigo-100'
                      : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  {visitedGallops.includes(gallop.id) && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 h-10 w-1.5 rounded-full bg-indigo-400 shadow-md" />
                  )}
                  {/* Design with text and emojis */}
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm mb-1">
                        {gallop.horseName}
                      </p>
                    </div>
                    {gallop.status && (
                      <div className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 leading-tight flex items-center">
                        {formatGallopStatus(gallop.status)}
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
                        // Extract only the surface type (Kum, Çim, Sen) from formats like "K:Normal", "Ç:Çok Yumuşak 3.9", "S:Normal", etc.
                        const surface = gallop.surface
                        if (surface.startsWith('K:') || surface.toLowerCase().includes('kum')) {
                          return 'Kum'
                        } else if (surface.startsWith('Ç:') || surface.toLowerCase().includes('çim')) {
                          return 'Çim'
                        } else if (surface.startsWith('S:') || surface.toLowerCase().includes('sentetik')) {
                          return 'Sen'
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
                  {isTrainer && gallop.stablemate && (
                    <div className="text-xs text-gray-500 mt-2">
                      🏢 Eküri: {gallop.stablemate.name}
                    </div>
                  )}
                </div>
              )
            })}
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

