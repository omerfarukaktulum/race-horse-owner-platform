'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Button } from '@/app/components/ui/button'
import { Activity, DollarSign, TrendingUp, Download } from 'lucide-react'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'
import { formatCurrency } from '@/lib/utils/format'
import { EXPENSE_CATEGORIES } from '@/lib/constants/expense-categories'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface HorseStats {
  totalHorses: number
  statusCounts: Record<string, number>
  racecourseCounts: Record<string, number>
  topSpendingHorses: Array<{
    id: string
    name: string
    totalSpend: number
    expenseCount: number
  }>
  avgMonthlySpendPerHorse: number
}

interface ExpenseStats {
  monthlyTotals: Record<string, number>
  categoryByMonth: Record<string, Record<string, number>>
  currentYearTotal: number
  categoryTotals: Record<string, number>
  avgPerHorse: number
  totalExpenses: number
}

const COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
]

export default function StatsPage() {
  const [horseStats, setHorseStats] = useState<HorseStats | null>(null)
  const [expenseStats, setExpenseStats] = useState<ExpenseStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const [horsesRes, expensesRes] = await Promise.all([
        fetch('/api/stats/horses', { credentials: 'include' }),
        fetch('/api/stats/expenses', { credentials: 'include' }),
      ])

      if (!horsesRes.ok || !expensesRes.ok) {
        throw new Error('İstatistikler yüklenemedi')
      }

      const horsesData = await horsesRes.json()
      const expensesData = await expensesRes.json()

      setHorseStats(horsesData)
      setExpenseStats(expensesData)
    } catch (error) {
      console.error('Fetch stats error:', error)
      toast.error('İstatistikler yüklenirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/stats/expenses/export', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Dışa aktarma başarısız')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `giderler-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Giderler CSV olarak indirildi')
    } catch (error) {
      toast.error('Dışa aktarma sırasında bir hata oluştu')
    } finally {
      setIsExporting(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    const found = EXPENSE_CATEGORIES.find((c) => c.value === category)
    return found ? found.label : category
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{TR.common.loading}</p>
        </div>
      </div>
    )
  }

  if (!horseStats || !expenseStats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>İstatistikler yüklenemedi</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Prepare chart data
  const statusChartData = Object.entries(horseStats.statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
  }))

  const racecourseChartData = Object.entries(horseStats.racecourseCounts).map(
    ([name, count]) => ({
      name,
      count,
    })
  )

  const monthlyChartData = Object.entries(expenseStats.monthlyTotals).map(
    ([month, total]) => ({
      month,
      total,
    })
  )

  const categoryChartData = Object.entries(expenseStats.categoryTotals).map(
    ([category, total]) => ({
      name: getCategoryLabel(category),
      value: total,
    })
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{TR.stats.title}</h1>
          <p className="text-gray-600 mt-1">Atlarınız ve giderleriniz hakkında detaylı analizler</p>
        </div>
        <Button onClick={handleExport} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'İndiriliyor...' : 'CSV İndir'}
        </Button>
      </div>

      <Tabs defaultValue="horses" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="horses">Atlar</TabsTrigger>
          <TabsTrigger value="expenses">Giderler</TabsTrigger>
        </TabsList>

        {/* Horses Tab */}
        <TabsContent value="horses" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam At</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{horseStats.totalHorses}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Yarışta</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {horseStats.statusCounts['RACING'] || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aygırlar</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {horseStats.statusCounts['STALLION'] || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kısraklar</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {horseStats.statusCounts['MARE'] || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribution by Racecourse */}
            {racecourseChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Hipodrom Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={racecourseChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Top Spending Horses */}
            <Card>
              <CardHeader>
                <CardTitle>En Çok Harcama Yapılan Atlar (Son 90 Gün)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {horseStats.topSpendingHorses.slice(0, 5).map((horse, index) => (
                    <div key={horse.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{horse.name}</p>
                          <p className="text-sm text-gray-500">
                            {horse.expenseCount} gider kaydı
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-indigo-600">
                          {formatCurrency(horse.totalSpend)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {horseStats.topSpendingHorses.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      Henüz gider kaydı bulunmuyor
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Average Monthly Spend */}
          <Card>
            <CardHeader>
              <CardTitle>At Başına Ortalama Aylık Harcama (Son 90 Gün)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-600">
                {formatCurrency(horseStats.avgMonthlySpendPerHorse)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Yıllık Toplam</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(expenseStats.currentYearTotal)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">At Başına Ortalama</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(expenseStats.avgPerHorse)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Kayıt</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{expenseStats.totalExpenses}</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            {monthlyChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Aylık Toplam Giderler (Son 12 Ay)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#6366f1"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Category Distribution */}
            {categoryChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Kategori Bazında Dağılım</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Category Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Kategori Bazında Detay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categoryChartData
                  .sort((a, b) => b.value - a.value)
                  .map((category, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <span className="font-bold text-indigo-600">
                        {formatCurrency(category.value)}
                      </span>
                    </div>
                  ))}
                {categoryChartData.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    Henüz gider kaydı bulunmuyor
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

