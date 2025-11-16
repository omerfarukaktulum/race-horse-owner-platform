'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { MapPin, Ruler, Layers, Users, TurkishLira } from 'lucide-react'
import {
  getCityDistribution,
  getDistanceDistribution,
  getSurfaceDistribution,
  getJockeyDistribution,
  getExpensesTrend,
} from '@/lib/utils/chart-data'

interface RaceHistory {
  id: string
  raceDate: string
  city?: string
  distance?: number
  surface?: string
  jockeyName?: string
  prizeMoney?: string
}

interface ExpenseData {
  date: string
  amount: string
}

interface Props {
  races: RaceHistory[]
  expenses: ExpenseData[]
}

// Distinct color palette for charts (vibrant colors)
const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#06b6d4', // Cyan
]

// Custom Legend Component
interface LegendItem {
  name: string
  value: number
  color: string
  percent: number
}

const CustomLegend = ({ data, total }: { data: LegendItem[]; total: number }) => {
  // Sort by value descending
  const sortedData = [...data].sort((a, b) => b.value - a.value)
  
  return (
    <div className="mt-4 space-y-2">
      {sortedData.map((item, index) => (
        <div key={index} className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 flex-1">
            <div
              className="w-4 h-4 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-700 truncate">{item.name}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="font-semibold text-gray-900">{item.value}</span>
            <span className="text-gray-500 w-12 text-right">{item.percent.toFixed(0)}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    // Calculate percent from the payload data
    const data = payload[0].payload
    const value = data.value || 0
    const percent = data.percent ? data.percent.toFixed(0) : '0'
    
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600">
          {value} koşu ({percent}%)
        </p>
      </div>
    )
  }
  return null
}

export function StatisticsCharts({ races, expenses }: Props) {
  const cityData = getCityDistribution(races)
  const distanceData = getDistanceDistribution(races)
  const surfaceData = getSurfaceDistribution(races)
  const jockeyData = getJockeyDistribution(races)
  
  // Process monthly earnings for the last 12 months
  const getMonthlyEarnings = (races: RaceHistory[]) => {
    const now = new Date()
    const monthlyData: { [key: string]: number } = {}
    
    // Initialize last 12 months with 0
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyData[monthKey] = 0
    }
    
    // Aggregate earnings by month
    races.forEach(race => {
      if (race.prizeMoney && parseFloat(race.prizeMoney) > 0) {
        const raceDate = new Date(race.raceDate)
        const monthKey = `${raceDate.getFullYear()}-${String(raceDate.getMonth() + 1).padStart(2, '0')}`
        
        if (monthlyData.hasOwnProperty(monthKey)) {
          monthlyData[monthKey] += parseFloat(race.prizeMoney)
        }
      }
    })
    
    // Convert to array format for chart
    return Object.entries(monthlyData).map(([month, earnings]) => {
      const [year, monthNum] = month.split('-')
      const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
      return {
        month: `${monthNames[parseInt(monthNum) - 1]} ${year.slice(2)}`,
        earnings: Math.round(earnings)
      }
    })
  }
  
  const monthlyEarnings = getMonthlyEarnings(races)
  
  // Process monthly expenses for the last 12 months
  const getMonthlyExpenses = (expenses: ExpenseData[]) => {
    const now = new Date()
    const monthlyData: { [key: string]: number } = {}
    
    // Initialize last 12 months with 0
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyData[monthKey] = 0
    }
    
    // Aggregate expenses by month
    expenses.forEach(expense => {
      if (expense.amount && parseFloat(expense.amount) > 0) {
        const expenseDate = new Date(expense.date)
        const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`
        
        if (monthlyData.hasOwnProperty(monthKey)) {
          monthlyData[monthKey] += parseFloat(expense.amount)
        }
      }
    })
    
    // Convert to array format for chart
    return Object.entries(monthlyData).map(([month, total]) => {
      const [year, monthNum] = month.split('-')
      const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
      return {
        month: `${monthNames[parseInt(monthNum) - 1]} ${year.slice(2)}`,
        expenses: Math.round(total)
      }
    })
  }
  
  const monthlyExpenses = getMonthlyExpenses(expenses)
  
  // Check if we have data
  const hasRaceData = races.length > 0
  const hasExpenseData = expenses.length > 0
  
  if (!hasRaceData && !hasExpenseData) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
        <CardContent className="py-16 text-center">
          <p className="text-gray-500">Henüz istatistik verisi bulunmuyor</p>
        </CardContent>
      </Card>
    )
  }
  
  // Helper to prepare legend data
  const prepareLegendData = (data: any[]): LegendItem[] => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    return data.map((item, index) => ({
      name: item.name,
      value: item.value,
      color: COLORS[index % COLORS.length],
      percent: (item.value / total) * 100,
    }))
  }
  
  return (
    <div className="space-y-6">
      {/* First Row: 3 Pie Charts */}
      {hasRaceData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* City Distribution */}
          {cityData.length > 0 && (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-indigo-600" />
                  Şehir Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={prepareLegendData(cityData)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {cityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <CustomLegend
                  data={prepareLegendData(cityData)}
                  total={cityData.reduce((sum, item) => sum + item.value, 0)}
                />
              </CardContent>
            </Card>
          )}
          
          {/* Distance Distribution */}
          {distanceData.length > 0 && (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                  <Ruler className="h-4 w-4 mr-2 text-indigo-600" />
                  Mesafe Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={prepareLegendData(distanceData)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {distanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <CustomLegend
                  data={prepareLegendData(distanceData)}
                  total={distanceData.reduce((sum, item) => sum + item.value, 0)}
                />
              </CardContent>
            </Card>
          )}
          
          {/* Surface Distribution */}
          {surfaceData.length > 0 && (
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                  <Layers className="h-4 w-4 mr-2 text-indigo-600" />
                  Pist Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={prepareLegendData(surfaceData)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {surfaceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <CustomLegend
                  data={prepareLegendData(surfaceData)}
                  total={surfaceData.reduce((sum, item) => sum + item.value, 0)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {/* Second Row: Monthly Charts (Earnings + Expenses) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Earnings */}
        {hasRaceData && monthlyEarnings.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                <TurkishLira className="h-4 w-4 mr-2 text-indigo-600" />
                Aylık Kazanç (Son 12 Ay)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyEarnings}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
                            <p className="font-semibold text-gray-900">{payload[0].payload.month}</p>
                            <p className="text-sm text-green-600 font-semibold">
                              ₺{payload[0].value?.toLocaleString('tr-TR')}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="earnings"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#colorEarnings)"
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        
        {/* Monthly Expenses */}
        {hasExpenseData && monthlyExpenses.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                <TurkishLira className="h-4 w-4 mr-2 text-indigo-600" />
                Aylık Gider (Son 12 Ay)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyExpenses}>
                  <defs>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
                            <p className="font-semibold text-gray-900">{payload[0].payload.month}</p>
                            <p className="text-sm text-red-600 font-semibold">
                              ₺{payload[0].value?.toLocaleString('tr-TR')}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    strokeWidth={3}
                    fill="url(#colorExpenses)"
                    dot={{ fill: '#ef4444', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Third Row: Jockey Distribution */}
      {hasRaceData && jockeyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                <Users className="h-4 w-4 mr-2 text-indigo-600" />
                Jokey Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={prepareLegendData(jockeyData)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {jockeyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <CustomLegend
                data={prepareLegendData(jockeyData)}
                total={jockeyData.reduce((sum, item) => sum + item.value, 0)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
