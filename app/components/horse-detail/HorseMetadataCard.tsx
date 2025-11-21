import { MapPin, Trophy } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

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
  lastExpenseDate?: string
}

interface Props {
  horse: HorseMetadata
}

export function HorseMetadataCard({ horse }: Props) {
  const currentYear = new Date().getFullYear()
  const age = horse.yob ? currentYear - horse.yob : null
  
  // Convert trainer name to camel case
  const formatTrainerName = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
  
  // Calculate days since last race
  let daysSinceRace = null
  if (horse.lastRaceDate) {
    const lastRace = new Date(horse.lastRaceDate)
    const now = new Date()
    daysSinceRace = Math.floor((now.getTime() - lastRace.getTime()) / (1000 * 60 * 60 * 24))
  }
  
  // Calculate days since last prize
  let daysSincePrize = null
  if (horse.lastPrizeDate) {
    const lastPrize = new Date(horse.lastPrizeDate)
    const now = new Date()
    daysSincePrize = Math.floor((now.getTime() - lastPrize.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Calculate days since last expense
  let daysSinceExpense = null
  if (horse.lastExpenseDate) {
    const lastExpense = new Date(horse.lastExpenseDate)
    const now = new Date()
    daysSinceExpense = Math.floor((now.getTime() - lastExpense.getTime()) / (1000 * 60 * 60 * 24))
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
            
            {/* Age, Gender, Handicap, Trainer - Matching horses page style */}
            <div className="flex flex-wrap gap-2 items-center mb-3">
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

              {horse.trainerName && (
                <span className="px-2.5 py-1 rounded-md text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-200">
                  👤 <span className="hidden sm:inline">Antrenör: </span>
                  {formatTrainerName(horse.trainerName)}
                </span>
              )}
            </div>
            
            {/* Activity Summary - Right after badges */}
            {(daysSinceRace !== null || daysSincePrize !== null || daysSinceExpense !== null) && (
              <div className="space-y-1 text-xs text-gray-600 mb-3">
                {daysSinceRace !== null && (
                  <div className="font-medium">
                    • Son koşu {daysSinceRace} gün önce
                  </div>
                )}
                
                {daysSincePrize !== null && (
                  <div className="font-medium">
                    • Son kazanç {daysSincePrize} gün önce
                  </div>
                )}

                {daysSinceExpense !== null && (
                  <div className="font-medium">
                    • Son gider {daysSinceExpense === 0 ? 'Bugün' : `${daysSinceExpense} gün önce`}
                  </div>
                )}
              </div>
            )}

          </div>
          
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
            
            {/* Race Record as columns */}
            {horse.totalRaces !== undefined && horse.totalRaces !== null && (
              <div className="mb-4">
                <div className="grid grid-cols-6 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      <span className="hidden sm:inline">Toplam Koşu</span>
                      <span className="sm:hidden">Toplam</span>
                    </p>
                    <p className="text-lg font-bold text-gray-900">{horse.totalRaces}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">1.lik</p>
                    <p className="text-lg font-bold text-gray-900">{horse.firstPlaces || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">2.lik</p>
                    <p className="text-lg font-bold text-gray-900">{horse.secondPlaces || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">3.lük</p>
                    <p className="text-lg font-bold text-gray-900">{horse.thirdPlaces || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">4.lük</p>
                    <p className="text-lg font-bold text-gray-900">{horse.fourthPlaces || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">5.lik</p>
                    <p className="text-lg font-bold text-gray-900">{horse.fifthPlaces || 0}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Prize Money */}
            {horse.prizeMoney && (
              <div className="mb-3">
                <p className="text-xs text-gray-500">İkramiye</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(horse.prizeMoney)}</p>
              </div>
            )}
            
            {/* Total Earnings with Premiums */}
            <div className="mt-3 pt-3 border-t border-indigo-200/50">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: Toplam Kazanç */}
                {horse.totalEarnings && (
                  <div className="flex flex-col justify-center">
                    <p className="text-xs text-gray-500 mb-1">Toplam Kazanç</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-[#6366f1] to-[#4f46e5] bg-clip-text text-transparent">
                      {formatCurrency(horse.totalEarnings)}
                    </p>
                  </div>
                )}
                
                {/* Right: Premiums side by side */}
                <div className="flex flex-wrap gap-3">
                  {horse.ownerPremium && (
                    <div className="min-w-[140px] bg-white/70 border border-indigo-100 rounded-lg px-3 py-2 shadow-sm">
                      <p className="text-xs text-gray-500">Sahip Primi</p>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(horse.ownerPremium)}</p>
                    </div>
                  )}
                  
                  {horse.breederPremium && (
                    <div className="min-w-[140px] bg-white/70 border border-indigo-100 rounded-lg px-3 py-2 shadow-sm">
                      <p className="text-xs text-gray-500">Yetiştirici Primi</p>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(horse.breederPremium)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
