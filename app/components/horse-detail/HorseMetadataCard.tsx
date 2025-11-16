import { MapPin, Trophy } from 'lucide-react'
import { formatCurrency, getRelativeTime } from '@/lib/utils/format'

interface HorseMetadata {
  name: string
  yob?: number
  gender?: string
  handicapPoints?: number
  sireName?: string
  damName?: string
  trainerName?: string
  currentLocation?: string
  locationType?: string
  totalRaces?: number
  prizeMoney?: string
  ownerPremium?: string
  breederPremium?: string
  totalEarnings?: string
  firstPlaces?: number
  secondPlaces?: number
  thirdPlaces?: number
  fourthPlaces?: number
  fifthPlaces?: number
  lastRaceDate?: string
  lastPrizeDate?: string
}

interface Props {
  horse: HorseMetadata
}

export function HorseMetadataCard({ horse }: Props) {
  const currentYear = new Date().getFullYear()
  const age = horse.yob ? currentYear - horse.yob : null
  
  // Calculate days since last race
  let daysSinceRace = null
  if (horse.lastRaceDate) {
    const lastRace = new Date(horse.lastRaceDate)
    const now = new Date()
    daysSinceRace = Math.floor((now.getTime() - lastRace.getTime()) / (1000 * 60 * 60 * 24))
  }
  
  // Determine gender badge color (matching horses page)
  const isMale = horse.gender?.toLowerCase().includes('erkek') || horse.gender?.toLowerCase().includes('aygır')
  const isFemale = horse.gender?.toLowerCase().includes('dişi') || horse.gender?.toLowerCase().includes('kısrak')
  
  return (
    <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg rounded-xl p-6 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Basic Info */}
        <div className="space-y-4">
          {/* Horse Name */}
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#6366f1] to-[#4f46e5] bg-clip-text text-transparent mb-3">
              {horse.name}
            </h1>
            
            {/* Origin - Right below name */}
            {(horse.sireName || horse.damName) && (
              <p className="text-sm text-gray-600 mb-3">
                {horse.sireName && horse.damName 
                  ? `${horse.sireName} - ${horse.damName}`
                  : horse.sireName || horse.damName}
              </p>
            )}
            
            {/* Age, Gender, Handicap - Matching horses page style */}
            <div className="flex flex-wrap gap-2 items-center">
              {age && (
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                  isMale 
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    : isFemale
                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {age} yaş ({horse.yob})
                </span>
              )}
              
              {horse.gender && (
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                  isMale 
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    : isFemale
                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                }`}>
                  {horse.gender}
                </span>
              )}
              
              {horse.handicapPoints !== undefined && horse.handicapPoints !== null && (
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                  HP: {horse.handicapPoints}
                </span>
              )}
            </div>
          </div>
          
          {/* Trainer */}
          {horse.trainerName && (
            <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200/50">
              <p className="text-sm text-gray-500 mb-1">Antrenör</p>
              <p className="text-base font-semibold text-gray-800">{horse.trainerName}</p>
            </div>
          )}
          
          {/* Current Location */}
          {horse.currentLocation && (
            <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200/50">
              <p className="text-sm text-gray-500 mb-1">
                <MapPin className="inline h-4 w-4 mr-1" />
                Mevcut Konum
              </p>
              <p className="text-base font-semibold text-gray-800">
                {horse.currentLocation}
                {horse.locationType && (
                  <span className="text-sm text-gray-500 ml-2">
                    ({horse.locationType === 'racecourse' ? 'Hipodrom' : 'Çiftlik'})
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
        
        {/* Right Column: Statistics */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200/50">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Trophy className="h-4 w-4 mr-2 text-indigo-600" />
              Kazanç İstatistikleri
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Total Races */}
              {horse.totalRaces !== undefined && horse.totalRaces !== null && (
                <div>
                  <p className="text-xs text-gray-500">Toplam Koşu</p>
                  <p className="text-lg font-bold text-gray-900">{horse.totalRaces}</p>
                </div>
              )}
              
              {/* Race Record - Inside Kazanç İstatistikleri */}
              {(horse.firstPlaces || horse.secondPlaces || horse.thirdPlaces) && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-2">Derece Dağılımı</p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-xl">🥇</span>
                      <span className="font-bold text-gray-900">{horse.firstPlaces || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xl">🥈</span>
                      <span className="font-bold text-gray-900">{horse.secondPlaces || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xl">🥉</span>
                      <span className="font-bold text-gray-900">{horse.thirdPlaces || 0}</span>
                    </div>
                    {(horse.fourthPlaces || horse.fifthPlaces) && (
                      <div className="text-gray-600 text-xs">
                        <span className="font-semibold">4.</span> {horse.fourthPlaces || 0} • 
                        <span className="font-semibold ml-1">5.</span> {horse.fifthPlaces || 0}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Prize Money */}
              {horse.prizeMoney && (
                <div>
                  <p className="text-xs text-gray-500">İkramiye</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(horse.prizeMoney)}</p>
                </div>
              )}
              
              {/* Owner Premium - Before Breeder Premium */}
              {horse.ownerPremium && (
                <div>
                  <p className="text-xs text-gray-500">Sahip Primi</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(horse.ownerPremium)}</p>
                </div>
              )}
              
              {/* Breeder Premium */}
              {horse.breederPremium && (
                <div>
                  <p className="text-xs text-gray-500">Yetiştirici Primi</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(horse.breederPremium)}</p>
                </div>
              )}
            </div>
            
            {/* Total Earnings - Highlighted */}
            {horse.totalEarnings && (
              <div className="mt-3 pt-3 border-t border-indigo-200/50">
                <p className="text-xs text-gray-500 mb-1">Toplam Kazanç</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-[#6366f1] to-[#4f46e5] bg-clip-text text-transparent">
                  {formatCurrency(horse.totalEarnings)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer: Recent Activity - At bottom */}
      {(horse.totalRaces || daysSinceRace !== null) && (
        <div className="mt-6 pt-4 border-t border-gray-200/50">
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {horse.totalRaces && (
              <span className="font-medium">
                {horse.totalRaces} koşu
              </span>
            )}
            
            {daysSinceRace !== null && (
              <span className="font-medium">
                • Son koşu {daysSinceRace} gün önce
              </span>
            )}
            
            {horse.lastPrizeDate && (
              <span className="font-medium">
                • Son kazanç {getRelativeTime(horse.lastPrizeDate)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
