import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { TrendingUp, Users, TurkishLira, Activity, BarChart3, Database, LayoutGrid, ClipboardList, FolderOpen, List, Package, Layers } from 'lucide-react'
import { Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-8 w-8 text-[#6366f1]" />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">EKÜRİM</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/signin">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">Giriş Yap</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl">
                Kayıt Ol
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          Yarış Atlarınızı Profesyonelce Yönetin
        </h2>
        <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          EKÜRİM ile atlarınızı takip edin, giderlerinizi yönetin ve
          antrenörlerinizle işbirliği yapın.
        </p>

        {/* Feature Highlights - Matching driving-license style */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* At Yönetimi */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-indigo-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <LayoutGrid className="h-6 w-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-indigo-600 mb-1">Tüm Atlarınız</div>
                <div className="text-sm font-bold text-indigo-600">At Yönetimi</div>
                <div className="text-xs text-gray-700 font-bold mt-1">tek platformda</div>
              </div>
            </div>

            {/* Gider Takibi */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-indigo-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TurkishLira className="h-6 w-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-emerald-600 mb-1">Kategorize</div>
                <div className="text-sm font-bold text-emerald-600">Gider Takibi</div>
                <div className="text-xs text-gray-700 font-bold mt-1">detaylı takip</div>
              </div>
            </div>

            {/* İstatistikler */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-indigo-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-amber-600 mb-1">Detaylı</div>
                <div className="text-sm font-bold text-amber-600">İstatistikler</div>
                <div className="text-xs text-gray-700 font-bold mt-1">raporlar ve analiz</div>
              </div>
            </div>

            {/* TJK Entegrasyonu */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-indigo-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-rose-600 mb-1">Otomatik</div>
                <div className="text-sm font-bold text-rose-600">TJK Senkronizasyon</div>
                <div className="text-xs text-gray-700 font-bold mt-1">gerçek zamanlı veri</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <Link href="/register">
            <Button size="lg" className="text-base lg:text-lg font-semibold px-6 lg:px-8 py-4 lg:py-6 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap">
              Hemen Başlayın
            </Button>
          </Link>
          <Link href="/signin">
            <Button size="lg" variant="outline" className="text-base lg:text-lg px-6 lg:px-8 py-4 lg:py-6 rounded-lg border-2 border-[#6366f1]/30 hover:bg-[#6366f1]/5 hover:border-[#6366f1]/50 text-[#6366f1] font-medium whitespace-nowrap shadow-lg hover:shadow-xl transition-all duration-300">
              Giriş Yap
            </Button>
          </Link>
        </div>
      </section>

      {/* Detailed Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8">
          Neden EKÜRİM?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border border-indigo-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-3">
                <LayoutGrid className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-indigo-600">At Yönetimi</CardTitle>
              <CardDescription>
                Aktif, aygır ve kısraklarınızı tek platformda yönetin
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-emerald-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-3">
                  <TurkishLira className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-emerald-600">Gider Takibi</CardTitle>
              <CardDescription>
                Tüm giderlerinizi kategorilere ayırarak kolayca takip edin
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-amber-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center mb-3">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-amber-600">İstatistikler</CardTitle>
              <CardDescription>
                Detaylı istatistikler ve raporlarla mali durumunuzu görün
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-rose-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-rose-600">Antrenör İşbirliği</CardTitle>
              <CardDescription>
                Antrenörlerinizle kolayca iletişim kurun ve işbirliği yapın
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white border-none">
          <CardContent className="p-12 text-center">
            <h3 className="text-3xl font-bold mb-4">Hazır mısınız?</h3>
            <p className="text-lg mb-8 opacity-90">
              EKÜRİM ile atlarınızı yönetmeye bugün başlayın
            </p>
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 bg-white text-[#6366f1] hover:bg-indigo-50 hover:text-[#4f46e5] shadow-lg hover:shadow-xl">
                Ücretsiz Deneyin
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Nordiys. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  )
}

