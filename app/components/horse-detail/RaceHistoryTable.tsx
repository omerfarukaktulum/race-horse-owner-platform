'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { formatDateShort, formatCurrency } from '@/lib/utils/format'
import { Video, Image as ImageIcon, Medal } from 'lucide-react'

interface RaceHistory {
  id: string
  raceDate: string
  city?: string
  distance?: number
  surface?: string
  surfaceType?: string
  position?: number
  derece?: string
  weight?: string
  jockeyName?: string
  raceNumber?: number
  raceName?: string
  raceType?: string
  trainerName?: string
  handicapPoints?: number
  prizeMoney?: string
  videoUrl?: string
  photoUrl?: string
}

interface Props {
  races: RaceHistory[]
}

export function RaceHistoryTable({ races }: Props) {
  if (races.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#6366f1] to-[#4f46e5] bg-clip-text text-transparent">
          Koşu Geçmişi
        </h2>
        <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
          <CardContent className="py-16 text-center">
            <p className="text-gray-500">Henüz koşu geçmişi bulunmuyor</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Sort races by date (most recent first)
  const sortedRaces = [...races].sort((a, b) => {
    return new Date(b.raceDate).getTime() - new Date(a.raceDate).getTime()
  })
  
  // Get surface color
  const getSurfaceColor = (surface?: string) => {
    if (!surface) return 'bg-gray-100 text-gray-800'
    
    if (surface.startsWith('Ç:') || surface === 'Ç' || surface === 'Çim') {
      return 'bg-green-100 text-green-800'
    } else if (surface.startsWith('K:') || surface === 'K' || surface === 'Kum') {
      return 'bg-orange-100 text-orange-800'
    } else if (surface.startsWith('S:') || surface === 'S' || surface.toLowerCase().includes('sentetik')) {
      return 'bg-[#d39b1e] text-white'
    }
    return 'bg-gray-100 text-gray-800'
  }
  
  // Format surface display
  const formatSurface = (surface?: string) => {
    if (!surface) return '-'
    if (surface.toLowerCase().includes('sentetik')) return 'Sen'
    if (surface.startsWith('S:') || surface === 'S') return 'Sen'
    return surface
  }
  
  // Get position medal
  const getPositionMedal = (position?: number) => {
    if (position === 1) return '🥇'
    if (position === 2) return '🥈'
    if (position === 3) return '🥉'
    return null
  }
  
  // Build TJK details URL
  const getTJKDetailsUrl = (race: RaceHistory) => {
    if (!race.videoUrl) return null
    
    // Extract race code from video URL (KosuKodu parameter)
    const match = race.videoUrl.match(/KosuKodu=(\d+)/)
    if (!match) return null
    
    const raceCode = match[1]
    const raceDate = new Date(race.raceDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    raceDate.setHours(0, 0, 0, 0)
    
    // Determine era
    let era = 'past'
    if (raceDate.getTime() === today.getTime()) {
      era = 'today'
    } else if (raceDate.getTime() > today.getTime()) {
      era = 'future'
    }
    
    // Format date as DD/MM/YYYY
    const day = String(raceDate.getDate()).padStart(2, '0')
    const month = String(raceDate.getMonth() + 1).padStart(2, '0')
    const year = raceDate.getFullYear()
    const formattedDate = `${day}/${month}/${year}`
    
    return `https://www.tjk.org/TR/YarisSever/Info/Page/GunlukYarisSonuclari?QueryParameter_Tarih=${formattedDate}&Era=${era}#${raceCode}`
  }
  
  return (
    <div>
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Şehir
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Koşu Türü
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Mesafe
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Pist
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Sıra
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Derece
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Jokey
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    İkramiye
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Medya
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedRaces.map((race, index) => {
                  const medal = getPositionMedal(race.position)
                  const isStriped = index % 2 === 1
                  
                  return (
                    <tr
                      key={race.id}
                      className={`transition-colors hover:bg-indigo-50/50 ${isStriped ? 'bg-gray-50/30' : ''}`}
                    >
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {formatDateShort(race.raceDate)}
                        </span>
                      </td>
                      
                      {/* City */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{race.city || '-'}</span>
                      </td>
                      
                      {/* Race Type - Moved here */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {race.raceType && (
                          <span className="px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-medium">
                            {race.raceType}
                          </span>
                        )}
                      </td>
                      
                      {/* Distance - Removed 'm' */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {race.distance || '-'}
                        </span>
                      </td>
                      
                      {/* Surface */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {race.surface && (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSurfaceColor(race.surface)}`}>
                            {formatSurface(race.surface)}
                          </span>
                        )}
                      </td>
                      
                      {/* Position */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          {medal && <span className="text-lg">{medal}</span>}
                          <span className={`text-sm font-bold ${race.position && race.position <= 3 ? 'text-indigo-600' : 'text-gray-900'}`}>
                            {race.position || '-'}
                          </span>
                        </div>
                      </td>
                      
                      {/* Derece (Time) - Matching mesafe font */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {race.derece || '-'}
                        </span>
                      </td>
                      
                      {/* Jockey */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{race.jockeyName || '-'}</span>
                      </td>
                      
                      {/* Prize Money */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {race.prizeMoney && parseFloat(race.prizeMoney) > 0 ? (
                          <span className="text-sm font-bold text-green-600">
                            {formatCurrency(race.prizeMoney)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      
                      {/* Media Links */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getTJKDetailsUrl(race) ? (
                            <a
                              href={getTJKDetailsUrl(race)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 transition-colors text-xs font-medium underline"
                              title="Koşu Detayları"
                            >
                              Details
                            </a>
                          ) : null}
                          {race.videoUrl ? (
                            <a
                              href={race.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 transition-colors"
                              title="Video"
                            >
                              <Video className="h-4 w-4" />
                            </a>
                          ) : null}
                          {race.photoUrl ? (
                            <a
                              href={race.photoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-800 transition-colors"
                              title="Foto"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </a>
                          ) : null}
                          {!getTJKDetailsUrl(race) && !race.videoUrl && !race.photoUrl && (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

