'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { CheckCircle2, Home, Mail, Key } from 'lucide-react'

/**
 * Admin onboarding: Completion page
 * Shows success message after completing owner setup
 * Displays user credentials for admin to share with the user
 */
export default function AdminCompletePage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch target user info to display credentials
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/api/admin/onboarding/target-user', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          setUserEmail(data.user?.email || null)
        }
      } catch (error) {
        console.error('Error fetching user info:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserInfo()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-700">
              Kurulum Tamamlandı!
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              At sahibi hesabı başarıyla oluşturuldu ve yapılandırıldı.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 font-medium mb-3">
              Kullanıcı artık giriş yapabilir ve platformu kullanmaya başlayabilir.
            </p>
            
            {isLoading ? (
              <p className="text-sm text-gray-600">Yükleniyor...</p>
            ) : userEmail ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-700 font-medium">Email:</span>
                  <span className="text-gray-900">{userEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Key className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-700 font-medium">Şifre:</span>
                  <span className="text-gray-900">(Oluşturulurken belirlenen şifre)</span>
                </div>
                <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-green-200">
                  Bu bilgileri kullanıcıyla paylaşın. Kullanıcı <code className="bg-green-100 px-1 rounded">/signin</code> sayfasından giriş yapabilir.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Kullanıcı bilgisi alınamadı.</p>
            )}
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => router.push('/admin')}
              className="flex-1 h-11 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Home className="mr-2 h-4 w-4" />
              Admin Paneline Dön
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/create-owner')}
              className="h-11"
            >
              Yeni Hesap Oluştur
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

