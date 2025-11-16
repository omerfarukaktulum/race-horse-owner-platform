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
  const expensesData = getExpensesTrend(expenses)
  
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
      <h2 className="text-2xl font-bold bg-gradient-to-r from-[#6366f1] to-[#4f46e5] bg-clip-text text-transparent">
        İstatistikler
      </h2>
      
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
      
      {/* Second Row: 2 Charts (Jockey + Expenses) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Jockey Distribution */}
        {hasRaceData && jockeyData.length > 0 && (
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
        )}
        
        {/* Expenses Trend */}
        {hasExpenseData && expensesData.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                <TurkishLira className="h-4 w-4 mr-2 text-indigo-600" />
                Gider Trendi (Son 3 Ay)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={expensesData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="week"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `₺${value}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
                            <p className="font-semibold text-gray-900">{payload[0].payload.week}</p>
                            <p className="text-sm text-gray-600">
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
                    dataKey="amount"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fill="url(#colorAmount)"
                    dot={{ fill: '#6366f1', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
