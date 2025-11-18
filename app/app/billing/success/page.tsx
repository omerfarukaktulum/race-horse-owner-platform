'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function BillingSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (sessionId) {
      toast.success('Ödeme başarılı! Aboneliğiniz aktifleştirildi.')
    }
  }, [sessionId])

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-center text-2xl">Ödeme Başarılı!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Premium aboneliğiniz başarıyla aktifleştirildi.
            </p>
            <p className="text-gray-600 mb-4">
              Artık tüm premium özelliklere erişebilirsiniz:
            </p>
            <ul className="text-left space-y-2 mb-6 max-w-md mx-auto">
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span>Sınırsız at ekleme</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span>Gelişmiş gider takibi</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span>Detaylı istatistikler</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span>CSV dışa aktarma</span>
              </li>
            </ul>
          </div>

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => router.push('/app/billing')}>
              Faturalandırmaya Git
            </Button>
            <Button onClick={() => router.push('/app/home')}>
              Ana Sayfaya Dön
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}




