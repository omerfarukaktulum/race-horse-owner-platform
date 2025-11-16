import { MapPin, Trophy, Calendar, Activity } from 'lucide-react'
import { formatCurrency, formatNumber, getRelativeTime } from '@/lib/utils/format'

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
  
  // Get gender color
  const genderColor = horse.gender?.toLowerCase().includes('dişi') 
    ? 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-800'
    : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800'
  
  return (
    <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg rounded-xl p-6 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Basic Info */}
        <div className="space-y-4">
          {/* Horse Name */}
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#6366f1] to-[#4f46e5] bg-clip-text text-transparent mb-2">
              {horse.name}
            </h1>
            
            {/* Age, Gender, Handicap */}
            <div className="flex flex-wrap gap-2 items-center">
              {age && (
                <span className="text-gray-600 text-sm font-medium">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  {age} yaş ({horse.yob})
                </span>
              )}
              
              {horse.gender && (
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${genderColor}`}>
                  {horse.gender}
                </span>
              )}
              
              {horse.handicapPoints !== undefined && horse.handicapPoints !== null && (
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800">
                  <Activity className="inline h-4 w-4 mr-1" />
                  HP: {horse.handicapPoints}
                </span>
              )}
            </div>
          </div>
          
          {/* Origin */}
          {(horse.sireName || horse.damName) && (
            <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200/50">
              <p className="text-sm text-gray-500 mb-1">Orijin</p>
              <p className="text-base font-semibold text-gray-800">
                {horse.sireName && horse.damName 
                  ? `${horse.sireName} - ${horse.damName}`
                  : horse.sireName || horse.damName}
              </p>
            </div>
          )}
          
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
              
              {/* Prize Money */}
              {horse.prizeMoney && (
                <div>
                  <p className="text-xs text-gray-500">İkramiye</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(horse.prizeMoney)}</p>
                </div>
              )}
              
              {/* Owner Premium */}
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
          
          {/* Race Record */}
          {(horse.firstPlaces || horse.secondPlaces || horse.thirdPlaces) && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-200/50">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Derece Dağılımı</h3>
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
                  <div className="text-gray-600">
                    <span className="font-semibold">4.</span> {horse.fourthPlaces || 0} • 
                    <span className="font-semibold ml-1">5.</span> {horse.fifthPlaces || 0}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer: Recent Activity */}
      {(horse.totalRaces || daysSinceRace !== null) && (
        <div className="mt-4 pt-4 border-t border-gray-200/50">
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {horse.totalRaces && (
              <span className="font-medium">
                <Trophy className="inline h-4 w-4 mr-1 text-indigo-600" />
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

