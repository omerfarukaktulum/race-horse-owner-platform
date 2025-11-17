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

