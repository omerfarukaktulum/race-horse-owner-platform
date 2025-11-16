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
                    Hipodrom
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Jokey
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Pist
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    200m
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    400m
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    600m
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    800m
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    1000m
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    1200m
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    1400m
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedGallops.map((gallop, index) => {
                  const isStriped = index % 2 === 1
                  const distances = typeof gallop.distances === 'object' ? gallop.distances : {}
                  
                  // Get specific distance times
                  const getDistance = (meter: string) => {
                    return distances[meter] || '-'
                  }
                  
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
                      
                      {/* Racecourse */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{gallop.racecourse || '-'}</span>
                      </td>
                      
                      {/* Jockey */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{gallop.jockeyName || '-'}</span>
                      </td>
                      
                      {/* Surface */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {gallop.surface && (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSurfaceColor(gallop.surface)}`}>
                            {formatSurface(gallop.surface)}
                          </span>
                        )}
                      </td>
                      
                      {/* 200m */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-mono text-gray-700">{getDistance('200')}</span>
                      </td>
                      
                      {/* 400m */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-mono text-gray-700">{getDistance('400')}</span>
                      </td>
                      
                      {/* 600m */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-mono text-gray-700">{getDistance('600')}</span>
                      </td>
                      
                      {/* 800m */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-mono text-gray-700">{getDistance('800')}</span>
                      </td>
                      
                      {/* 1000m */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-mono text-gray-700">{getDistance('1000')}</span>
                      </td>
                      
                      {/* 1200m */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-mono text-gray-700">{getDistance('1200')}</span>
                      </td>
                      
                      {/* 1400m */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-mono text-gray-700">{getDistance('1400')}</span>
                      </td>
                      
                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{gallop.status || '-'}</span>
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

