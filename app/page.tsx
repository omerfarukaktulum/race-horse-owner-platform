import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { TrendingUp, Users, TurkishLira, Activity, BarChart3, Database, LayoutGrid, ClipboardList, FolderOpen, List, Package, Layers, Trophy, Calendar, Heart, Pill, BookOpen, FileText, MapPin, Stethoscope, CalendarCheck } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="relative overflow-hidden min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50">
      <div
        className="pointer-events-none absolute inset-0 flex items-start justify-center pt-16 md:pt-24"
        aria-hidden="true"
      >
        <Image
          src="/logo.png"
          alt=""
          width={1040}
          height={1040}
          className="max-w-[80vw] opacity-15 mix-blend-multiply"
          priority
        />
      </div>
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Image
                src="/logo.png"
                alt="StableMate logo"
                width={64}
                height={64}
                className="h-12 w-auto"
                style={{ filter: 'brightness(0.7) contrast(1.3) saturate(1.5)' }}
                priority
              />
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                EKÜRİM
              </h1>
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
          Hastalık takibi, çıkıcı ilaç yönetimi, idman planları, gider takibi, yarış ve idman verilerini otomatik senkronize edin, 
          notlar tutun ve antrenörlerinizle işbirliği yapın.
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
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-emerald-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TurkishLira className="h-6 w-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-emerald-600 mb-1">Kategorize</div>
                <div className="text-sm font-bold text-emerald-600">Gider ve Not Takibi</div>
                <div className="text-xs text-gray-700 font-bold mt-1">detaylı takip</div>
              </div>
            </div>

            {/* İstatistikler */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-amber-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
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
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-rose-100/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-rose-600 mb-1">Otomatik</div>
                <div className="text-sm font-bold text-rose-600">Veri Senkronizasyonu</div>
                <div className="text-xs text-gray-700 font-bold mt-1">yarış, idman, kayıt</div>
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
        <section className="container mx-auto px-4 pt-8 pb-16">
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
                Aktif, aygır ve kısraklarınızı tek platformda yönetin, detaylı profiller oluşturun
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
                Tüm giderlerinizi kategorilere ayırarak kolayca takip edin, fotoğraflarla belgelendirin
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-amber-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center mb-3">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-amber-600">İstatistikler</CardTitle>
              <CardDescription>
                Detaylı istatistikler, grafikler ve CSV raporlarla mali durumunuzu görün
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-rose-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center mb-3">
                <Database className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-rose-600">Veri Entegrasyonu</CardTitle>
              <CardDescription>
                Yarış sonuçları, idmanlar ve kayıtlar otomatik senkronize edilir
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mb-3">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-blue-600">Not Yönetimi</CardTitle>
              <CardDescription>
                Atlarınız için kategorize edilmiş notlar tutun, fotoğraflarla zenginleştirin
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-red-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-rose-600 rounded-full flex items-center justify-center mb-3">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-red-600">Hastalık Takibi</CardTitle>
              <CardDescription>
                Atlarınızın hastalık geçmişini takip edin, operasyon kayıtları tutun ve fotoğraflarla belgelendirin
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-orange-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-full flex items-center justify-center mb-3">
                <Pill className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-orange-600">Çıkıcı İlaç Yönetimi</CardTitle>
              <CardDescription>
                Yasaklı/Çıkıcı ilaçları takip edin, bekleme sürelerini hesaplayın ve yarışa uygunluğu kontrol edin
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-purple-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full flex items-center justify-center mb-3">
                <CalendarCheck className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-purple-600">İdman Planı</CardTitle>
              <CardDescription>
                Atlarınız için idman planları oluşturun, takip edin ve antrenörlerinizle paylaşın
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-cyan-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mb-3">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-cyan-600">Pedigri Bilgileri</CardTitle>
              <CardDescription>
                Detaylı soy ağacı bilgileri, baba ve anne hattından 4 nesil bilgi takibi
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-green-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-3">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-green-600">Yarış Geçmişi</CardTitle>
              <CardDescription>
                Tüm yarış sonuçlarınızı görüntüleyin, pozisyon, ödül ve performans analizi yapın
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-teal-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full flex items-center justify-center mb-3">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-teal-600">İdman Kayıtları</CardTitle>
              <CardDescription>
                İdman performanslarını takip edin, mesafe ve zaman kayıtlarını analiz edin
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-violet-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center mb-3">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-violet-600">Konum Takibi</CardTitle>
              <CardDescription>
                Atlarınızın hipodrom ve çiftlik konumlarını takip edin, geçmiş kayıtlarını görüntüleyin
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-purple-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full flex items-center justify-center mb-3">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-purple-600">Aktif Ana Sayfa</CardTitle>
              <CardDescription>
                Son koşular, idmanlar, kayıtlar ve giderler tek bakışta
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-teal-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-green-600 rounded-full flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-teal-600">Eküri Yönetimi</CardTitle>
              <CardDescription>
                Antrenörlerinizi yönetin, ortak sahipler ekleyin, bildirim ayarlarını yapın
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-orange-100/50 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mb-3">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-orange-600">Abonelik Yönetimi</CardTitle>
              <CardDescription>
                Esnek abonelik planları ile Premium özelliklere erişin
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

        {/* Footer */}
        <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
          <div className="container mx-auto px-4 py-8 text-center text-gray-600">
            <p>&copy; {new Date().getFullYear()} Nordiys. Tüm hakları saklıdır.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

