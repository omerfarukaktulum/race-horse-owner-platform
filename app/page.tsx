import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { TrendingUp, Users, DollarSign } from 'lucide-react'
import { Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">TJK Stablemate</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/signin">
              <Button variant="ghost">Giriş Yap</Button>
            </Link>
            <Link href="/register">
              <Button>Kayıt Ol</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">
          Yarış Atlarınızı Profesyonelce Yönetin
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          TJK Stablemate ile atlarınızı takip edin, giderlerinizi yönetin ve
          antrenörlerinizle işbirliği yapın.
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/register">
            <Button size="lg" className="text-lg px-8">
              Hemen Başlayın
            </Button>
          </Link>
          <Link href="/signin">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Giriş Yap
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Sparkles className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>At Yönetimi</CardTitle>
              <CardDescription>
                Yarışta, aygır ve kısraklarınızı tek platformda yönetin
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <DollarSign className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Gider Takibi</CardTitle>
              <CardDescription>
                Tüm giderlerinizi kategorilere ayırarak kolayca takip edin
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>İstatistikler</CardTitle>
              <CardDescription>
                Detaylı istatistikler ve raporlarla mali durumunuzu görün
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-orange-600 mb-2" />
              <CardTitle>Antrenör İşbirliği</CardTitle>
              <CardDescription>
                Antrenörlerinizle kolayca iletişim kurun ve işbirliği yapın
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none">
          <CardContent className="p-12 text-center">
            <h3 className="text-3xl font-bold mb-4">Hazır mısınız?</h3>
            <p className="text-lg mb-8 opacity-90">
              TJK Stablemate ile atlarınızı yönetmeye bugün başlayın
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Ücretsiz Deneyin
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>&copy; 2024 TJK Stablemate. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  )
}

