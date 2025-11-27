'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Check, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'

interface OwnerProfile {
  subscriptionStatus: string | null
  subscriptionExpiresAt: string | null
  stripeCustomerId: string | null
}

export default function BillingPage() {
  const [profile, setProfile] = useState<OwnerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingSession, setIsCreatingSession] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })
      const data = await response.json()

      if (response.ok && data.user?.ownerProfile) {
        setProfile(data.user.ownerProfile)
      }
    } catch (error) {
      console.error('Fetch profile error:', error)
      toast.error('Profil bilgileri yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscribe = async () => {
    setIsCreatingSession(true)
    try {
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ödeme sayfası oluşturulamadı')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
      setIsCreatingSession(false)
    }
  }

  const handleManageSubscription = async () => {
    setIsCreatingSession(true)
    try {
      const response = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Yönetim sayfası oluşturulamadı')
      }

      // Redirect to Stripe Portal
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu'
      toast.error(message)
      setIsCreatingSession(false)
    }
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

  const hasActiveSubscription = profile?.subscriptionStatus === 'ACTIVE'

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">{TR.billing.title}</h1>

      {/* Current Plan */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Mevcut Planınız</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">
                {hasActiveSubscription ? 'Premium Plan' : 'Ücretsiz Plan'}
              </p>
              <p className="text-gray-600 mt-1">
                {hasActiveSubscription
                  ? `Sonraki ödeme: ${
                      profile?.subscriptionExpiresAt
                        ? new Date(profile.subscriptionExpiresAt).toLocaleDateString('tr-TR')
                        : 'Bilinmiyor'
                    }`
                  : 'Sınırlı özellikler'}
              </p>
            </div>
            {hasActiveSubscription && (
              <Button onClick={handleManageSubscription} disabled={isCreatingSession}>
                <CreditCard className="h-4 w-4 mr-2" />
                {isCreatingSession ? 'Yükleniyor...' : 'Aboneliği Yönet'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      {!hasActiveSubscription && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Ücretsiz</CardTitle>
              <CardDescription>Başlamak için ideal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <p className="text-4xl font-bold">₺0</p>
                <p className="text-gray-600">/ ay</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">2 ata kadar</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Temel gider takibi</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Sınırlı istatistikler</span>
                </li>
              </ul>

              <Button variant="outline" className="w-full" disabled>
                Mevcut Plan
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="border-indigo-600 border-2">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Premium</CardTitle>
                  <CardDescription>Tüm özelliklere erişim</CardDescription>
                </div>
                <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded">
                  Önerilen
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <p className="text-4xl font-bold">₺99</p>
                <p className="text-gray-600">/ ay</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Sınırsız at</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Gelişmiş gider takibi ve fotoğraf yükleme</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Detaylı istatistikler ve raporlar</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">CSV dışa aktarma</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Antrenör işbirliği</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Öncelikli destek</span>
                </li>
              </ul>

              <Button
                className="w-full"
                onClick={handleSubscribe}
                disabled={isCreatingSession}
              >
                {isCreatingSession ? 'Yükleniyor...' : 'Şimdi Abone Ol'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}






