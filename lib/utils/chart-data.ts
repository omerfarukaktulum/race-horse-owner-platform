interface RaceHistory {
  id: string
  raceDate: string
  city?: string
  distance?: number
  surface?: string
  surfaceType?: string
  position?: number
  jockeyName?: string
  prizeMoney?: string
  raceType?: string
}

interface ChartDataPoint {
  name: string
  value: number
  color?: string
}

/**
 * Get distribution of cities where horse raced
 */
export function getCityDistribution(races: RaceHistory[], topN: number = 5): ChartDataPoint[] {
  const cityCount: Record<string, number> = {}
  
  races.forEach((race) => {
    if (race.city) {
      cityCount[race.city] = (cityCount[race.city] || 0) + 1
    }
  })
  
  // Sort by count
  const sorted = Object.entries(cityCount)
    .sort(([, a], [, b]) => b - a)
  
  // Take top N cities
  const topCities = sorted.slice(0, topN)
  const others = sorted.slice(topN)
  
  const result: ChartDataPoint[] = topCities.map(([city, count]) => ({
    name: city,
    value: count,
  }))
  
  // Add "Diğer" if there are more cities
  if (others.length > 0) {
    const othersCount = others.reduce((sum, [, count]) => sum + count, 0)
    result.push({
      name: 'Diğer',
      value: othersCount,
    })
  }
  
  return result
}

/**
 * Get distribution of race distances
 */
export function getDistanceDistribution(races: RaceHistory[], topN: number = 5): ChartDataPoint[] {
  const distanceCount: Record<string, number> = {}
  
  races.forEach((race) => {
    if (race.distance) {
      const key = `${race.distance}m`
      distanceCount[key] = (distanceCount[key] || 0) + 1
    }
  })
  
  // Sort by count
  const sorted = Object.entries(distanceCount)
    .sort(([, a], [, b]) => b - a)
  
  // Take top N distances
  const topDistances = sorted.slice(0, topN)
  const others = sorted.slice(topN)
  
  const result: ChartDataPoint[] = topDistances.map(([distance, count]) => ({
    name: distance,
    value: count,
  }))
  
  // Add "Diğer" if there are more distances
  if (others.length > 0) {
    const othersCount = others.reduce((sum, [, count]) => sum + count, 0)
    result.push({
      name: 'Diğer',
      value: othersCount,
    })
  }
  
  return result
}

/**
 * Get distribution of race surfaces (Çim, Kum, Sentetik)
 */
export function getSurfaceDistribution(races: RaceHistory[]): ChartDataPoint[] {
  const surfaceCount: Record<string, number> = {}
  const surfaceColors: Record<string, string> = {
    'Çim': '#009900', // Official green color
    'Kum': '#996633', // Official brown color
    'Sentetik': '#d39b1e', // Official gold/yellow color
    'S': '#d39b1e', // Gold/Yellow (alternative notation)
    'Ç': '#009900', // Green (alternative notation)
    'K': '#996633', // Brown (alternative notation)
  }
  
  races.forEach((race) => {
    if (race.surface) {
      // Extract the main surface type (Ç, K, S or full names)
      let surfaceType = race.surface
      if (surfaceType.startsWith('Ç:') || surfaceType === 'Ç') {
        surfaceType = 'Çim'
      } else if (surfaceType.startsWith('K:') || surfaceType === 'K') {
        surfaceType = 'Kum'
      } else if (surfaceType.startsWith('S:') || surfaceType === 'S') {
        surfaceType = 'Sentetik'
      }
      
      surfaceCount[surfaceType] = (surfaceCount[surfaceType] || 0) + 1
    }
  })
  
  return Object.entries(surfaceCount)
    .map(([surface, count]) => ({
      name: surface,
      value: count,
      color: surfaceColors[surface] || '#6366f1',
    }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Abbreviate race type names for display
 */
export function abbreviateRaceType(raceType: string): string {
  if (raceType.includes('Kısa Vade')) {
    return raceType.replace(/Kısa Vade/g, 'KV')
  }
  return raceType
}

/**
 * Get distribution of race types (Kosu Turu)
 */
export function getRaceTypeDistribution(races: RaceHistory[], topN: number = 5): ChartDataPoint[] {
  const raceTypeCount: Record<string, number> = {}
  
  races.forEach((race) => {
    if (race.raceType) {
      raceTypeCount[race.raceType] = (raceTypeCount[race.raceType] || 0) + 1
    }
  })
  
  // Sort by count
  const sorted = Object.entries(raceTypeCount)
    .sort(([, a], [, b]) => b - a)
  
  // Take top N race types
  const topRaceTypes = sorted.slice(0, topN)
  const others = sorted.slice(topN)
  
  const result: ChartDataPoint[] = topRaceTypes.map(([raceType, count]) => ({
    name: abbreviateRaceType(raceType),
    value: count,
  }))
  
  // Add "Diğer" if there are more race types
  if (others.length > 0) {
    const othersCount = others.reduce((sum, [, count]) => sum + count, 0)
    result.push({
      name: 'Diğer',
      value: othersCount,
    })
  }
  
  return result
}

/**
 * Get distribution of jockeys who rode the horse
 */
export function getJockeyDistribution(races: RaceHistory[], topN: number = 5): ChartDataPoint[] {
  const jockeyCount: Record<string, number> = {}
  
  races.forEach((race) => {
    if (race.jockeyName) {
      jockeyCount[race.jockeyName] = (jockeyCount[race.jockeyName] || 0) + 1
    }
  })
  
  // Sort by count
  const sorted = Object.entries(jockeyCount)
    .sort(([, a], [, b]) => b - a)
  
  // Take top N jockeys
  const topJockeys = sorted.slice(0, topN)
  const others = sorted.slice(topN)
  
  const result: ChartDataPoint[] = topJockeys.map(([jockey, count]) => ({
    name: jockey,
    value: count,
  }))
  
  // Add "Diğer" if there are more jockeys
  if (others.length > 0) {
    const othersCount = others.reduce((sum, [, count]) => sum + count, 0)
    result.push({
      name: 'Diğer',
      value: othersCount,
    })
  }
  
  return result
}

interface ExpenseData {
  date: string
  amount: string
}

interface ExpenseTrendPoint {
  week: string
  amount: number
}

/**
 * Get weekly expense trend for the last 3 months
 */
export function getExpensesTrend(expenses: ExpenseData[]): ExpenseTrendPoint[] {
  // Calculate 3 months ago date
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  
  // Filter expenses from last 3 months
  const recentExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.date)
    return expenseDate >= threeMonthsAgo
  })
  
  // Group by week
  const weeklyExpenses: Record<string, number> = {}
  
  recentExpenses.forEach((expense) => {
    const date = new Date(expense.date)
    // Get the week start date (Monday)
    const weekStart = new Date(date)
    const day = weekStart.getDay()
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)
    
    const weekKey = weekStart.toISOString().split('T')[0]
    const amount = parseFloat(expense.amount) || 0
    
    weeklyExpenses[weekKey] = (weeklyExpenses[weekKey] || 0) + amount
  })
  
  // Convert to array and sort by date
  const result = Object.entries(weeklyExpenses)
    .map(([week, amount]) => {
      // Format week as "DD MMM"
      const date = new Date(week)
      const formatted = date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'short',
      })
      
      return {
        week: formatted,
        amount: Math.round(amount),
      }
    })
    .sort((a, b) => {
      // Sort by original week date
      const weekKeyA = Object.keys(weeklyExpenses).find(
        (key) => weeklyExpenses[key] === Object.values(weeklyExpenses).find((v) => v === a.amount)
      )
      const weekKeyB = Object.keys(weeklyExpenses).find(
        (key) => weeklyExpenses[key] === Object.values(weeklyExpenses).find((v) => v === b.amount)
      )
      return (weekKeyA || '').localeCompare(weekKeyB || '')
    })
  
  // Fill in missing weeks with 0
  if (result.length > 0) {
    const firstWeek = new Date(Object.keys(weeklyExpenses)[0])
    const lastWeek = new Date()
    const allWeeks: ExpenseTrendPoint[] = []
    
    let currentWeek = new Date(firstWeek)
    while (currentWeek <= lastWeek) {
      const weekKey = currentWeek.toISOString().split('T')[0]
      const formatted = currentWeek.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'short',
      })
      
      allWeeks.push({
        week: formatted,
        amount: weeklyExpenses[weekKey] || 0,
      })
      
      currentWeek.setDate(currentWeek.getDate() + 7)
    }
    
    return allWeeks
  }
  
  return result
}

/**
 * Get surface performance data grouped by surface and position groups
 * Returns data formatted for grouped bar chart
 */
export function getSurfacePerformanceData(races: RaceHistory[]): {
  surface: string
  'İlk 3 sıra': number
  'Tabela sonu': number
  'Tabela dışı': number
}[] {
  // Group races by surface and position
  const performanceData: Record<string, { top3: number; fourthFifth: number; outOfTop5: number }> = {}
  
  races.forEach((race) => {
    if (!race.surface) return

    // Normalize surface name
    let surfaceType = race.surface
    if (surfaceType.startsWith('Ç:') || surfaceType === 'Ç') {
      surfaceType = 'Çim'
    } else if (surfaceType.startsWith('K:') || surfaceType === 'K') {
      surfaceType = 'Kum'
    } else if (surfaceType.startsWith('S:') || surfaceType === 'S') {
      surfaceType = 'Sentetik'
    }

    if (!performanceData[surfaceType]) {
      performanceData[surfaceType] = { top3: 0, fourthFifth: 0, outOfTop5: 0 }
    }

    const position = race.position
    if (position == null) {
      // If position data is missing, count it under "Tabela dışı" so the surface still appears
      performanceData[surfaceType].outOfTop5++
      return
    }

    if (position >= 1 && position <= 3) {
      performanceData[surfaceType].top3++
    } else if (position >= 4 && position <= 5) {
      performanceData[surfaceType].fourthFifth++
    } else if (position > 5) {
      performanceData[surfaceType].outOfTop5++
    }
  })
  
  // Convert to array format for chart
  return Object.entries(performanceData)
    .map(([surface, data]) => ({
      surface,
      'İlk 3 sıra': data.top3,
      'Tabela sonu': data.fourthFifth,
      'Tabela dışı': data.outOfTop5,
    }))
    .sort((a, b) => {
      // Sort by total races (descending)
      const totalA = a['İlk 3 sıra'] + a['Tabela sonu'] + a['Tabela dışı']
      const totalB = b['İlk 3 sıra'] + b['Tabela sonu'] + b['Tabela dışı']
      return totalB - totalA
    })
}

/**
 * Get city performance data grouped by city and position groups
 * Returns data formatted for grouped bar chart
 */
export function getCityPerformanceData(races: RaceHistory[], selectedCity?: string): {
  city: string
  'İlk 3 sıra': number
  'Tabela sonu': number
  'Tabela dışı': number
}[] {
  // Group races by city and position
  const performanceData: Record<string, { top3: number; fourthFifth: number; outOfTop5: number }> = {}
  
  races.forEach((race) => {
    if (race.city && race.position) {
      // Filter by selected city if provided
      if (selectedCity && race.city !== selectedCity) {
        return
      }
      
      if (!performanceData[race.city]) {
        performanceData[race.city] = { top3: 0, fourthFifth: 0, outOfTop5: 0 }
      }
      
      const position = race.position
      if (position >= 1 && position <= 3) {
        performanceData[race.city].top3++
      } else if (position >= 4 && position <= 5) {
        performanceData[race.city].fourthFifth++
      } else if (position > 5) {
        performanceData[race.city].outOfTop5++
      }
    }
  })
  
  // Convert to array format for chart
  return Object.entries(performanceData)
    .map(([city, data]) => ({
      city,
      'İlk 3 sıra': data.top3,
      'Tabela sonu': data.fourthFifth,
      'Tabela dışı': data.outOfTop5,
    }))
    .sort((a, b) => {
      // Sort by total races (descending)
      const totalA = a['İlk 3 sıra'] + a['Tabela sonu'] + a['Tabela dışı']
      const totalB = b['İlk 3 sıra'] + b['Tabela sonu'] + b['Tabela dışı']
      return totalB - totalA
    })
}

/**
 * Get jockey performance data grouped by jockey and position groups
 * Returns data formatted for pie charts
 */
export function getJockeyPerformanceData(races: RaceHistory[], selectedJockey?: string): {
  jockey: string
  'İlk 3 sıra': number
  'Tabela sonu': number
  'Tabela dışı': number
}[] {
  // Group races by jockey and position
  const performanceData: Record<string, { top3: number; fourthFifth: number; outOfTop5: number }> = {}
  
  races.forEach((race) => {
    if (race.jockeyName && race.position) {
      // Filter by selected jockey if provided
      if (selectedJockey && race.jockeyName !== selectedJockey) {
        return
      }
      
      if (!performanceData[race.jockeyName]) {
        performanceData[race.jockeyName] = { top3: 0, fourthFifth: 0, outOfTop5: 0 }
      }
      
      const position = race.position
      if (position >= 1 && position <= 3) {
        performanceData[race.jockeyName].top3++
      } else if (position >= 4 && position <= 5) {
        performanceData[race.jockeyName].fourthFifth++
      } else if (position > 5) {
        performanceData[race.jockeyName].outOfTop5++
      }
    }
  })
  
  // Convert to array format for chart
  return Object.entries(performanceData)
    .map(([jockey, data]) => ({
      jockey,
      'İlk 3 sıra': data.top3,
      'Tabela sonu': data.fourthFifth,
      'Tabela dışı': data.outOfTop5,
    }))
    .sort((a, b) => {
      // Sort by total races (descending)
      const totalA = a['İlk 3 sıra'] + a['Tabela sonu'] + a['Tabela dışı']
      const totalB = b['İlk 3 sıra'] + b['Tabela sonu'] + b['Tabela dışı']
      return totalB - totalA
    })
}

/**
 * Get distance category from distance value
 */
function getDistanceCategory(distance: number): 'Kısa Mesafe' | 'Orta Mesafe' | 'Uzun Mesafe' | null {
  if (distance >= 800 && distance <= 1400) {
    return 'Kısa Mesafe'
  } else if (distance > 1400 && distance <= 1900) {
    return 'Orta Mesafe'
  } else if (distance > 1900) {
    return 'Uzun Mesafe'
  }
  return null
}

/**
 * Get distance performance data grouped by distance category and position groups
 * Returns data formatted for pie charts
 */
export function getDistancePerformanceData(races: RaceHistory[]): {
  distance: string
  'İlk 3 sıra': number
  'Tabela sonu': number
  'Tabela dışı': number
}[] {
  // Group races by distance category and position
  const performanceData: Record<string, { top3: number; fourthFifth: number; outOfTop5: number }> = {}
  
  races.forEach((race) => {
    if (race.distance && race.position) {
      const distanceCategory = getDistanceCategory(race.distance)
      if (!distanceCategory) {
        return
      }
      
      if (!performanceData[distanceCategory]) {
        performanceData[distanceCategory] = { top3: 0, fourthFifth: 0, outOfTop5: 0 }
      }
      
      const position = race.position
      if (position >= 1 && position <= 3) {
        performanceData[distanceCategory].top3++
      } else if (position >= 4 && position <= 5) {
        performanceData[distanceCategory].fourthFifth++
      } else if (position > 5) {
        performanceData[distanceCategory].outOfTop5++
      }
    }
  })
  
  // Convert to array format for chart, ordered: Kısa, Orta, Uzun
  const order = ['Kısa Mesafe', 'Orta Mesafe', 'Uzun Mesafe']
  return order
    .filter(category => performanceData[category])
    .map((category) => ({
      distance: category,
      'İlk 3 sıra': performanceData[category].top3,
      'Tabela sonu': performanceData[category].fourthFifth,
      'Tabela dışı': performanceData[category].outOfTop5,
    }))
}

