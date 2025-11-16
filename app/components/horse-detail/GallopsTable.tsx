'use client'

import { Card, CardContent } from '@/app/components/ui/card'
import { formatDateShort } from '@/lib/utils/format'

interface Gallop {
  id: string
  gallopDate: string
  status?: string
  racecourse?: string
  surface?: string
  jockeyName?: string
  distances: any // JSON object with distances
}

interface Props {
  gallops: Gallop[]
}

export function GallopsTable({ gallops }: Props) {
  if (gallops.length === 0) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
        <CardContent className="py-16 text-center">
          <p className="text-gray-500">Henüz idman verisi bulunmuyor</p>
        </CardContent>
      </Card>
    )
  }
  
  // Sort gallops by date (most recent first)
  const sortedGallops = [...gallops].sort((a, b) => {
    return new Date(b.gallopDate).getTime() - new Date(a.gallopDate).getTime()
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
    return surface
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
                    Durum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Hipodrom
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Pist
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Jokey
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Mesafeler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedGallops.map((gallop, index) => {
                  const isStriped = index % 2 === 1
                  const distances = typeof gallop.distances === 'object' ? gallop.distances : {}
                  const distanceEntries = Object.entries(distances).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                  
                  return (
                    <tr
                      key={gallop.id}
                      className={`transition-colors hover:bg-indigo-50/50 ${isStriped ? 'bg-gray-50/30' : ''}`}
                    >
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {formatDateShort(gallop.gallopDate)}
                        </span>
                      </td>
                      
                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{gallop.status || '-'}</span>
                      </td>
                      
                      {/* Racecourse */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{gallop.racecourse || '-'}</span>
                      </td>
                      
                      {/* Surface */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {gallop.surface && (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSurfaceColor(gallop.surface)}`}>
                            {formatSurface(gallop.surface)}
                          </span>
                        )}
                      </td>
                      
                      {/* Jockey */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{gallop.jockeyName || '-'}</span>
                      </td>
                      
                      {/* Distances */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {distanceEntries.length > 0 ? (
                            distanceEntries.map(([distance, time]) => (
                              <span key={distance} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {distance}m: <span className="font-mono font-medium">{time as string}</span>
                              </span>
                            ))
                          ) : (
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

