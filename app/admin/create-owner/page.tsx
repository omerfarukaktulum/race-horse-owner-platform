'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { UserPlus, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Admin page to create a new owner account
 * First step: Enter user's email and password
 * Then proceeds to onboarding flow (owner lookup, stablemate setup, etc.)
 * All operations will be bound to the target user, not the admin
 */
export default function CreateOwnerPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.error('Email gerekli')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor')
      return
    }

    if (password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalı')
      return
    }

    setIsLoading(true)

    try {
      // Create user account
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          role: 'OWNER',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kullanıcı oluşturulamadı')
      }

      toast.success('Kullanıcı hesabı oluşturuldu')
      
      // Store target user ID in cookie for onboarding APIs
      document.cookie = `admin-target-user-id=${data.userId}; path=/; max-age=3600` // 1 hour
      
      // Navigate to owner lookup (onboarding flow)
      router.push('/admin/create-owner/owner-lookup')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'İşlem başarısız'
      toast.error(message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-full flex items-center justify-center shadow-lg">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-700">
                Yeni At Sahibi Oluştur
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Kullanıcının email ve şifresini girin, ardından eküri kurulumuna geçin
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  Kullanıcı Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="kullanici@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 border-gray-300 focus:border-indigo-600 focus:ring-indigo-600"
                />
                <p className="text-xs text-gray-500">Kullanıcı bu email ile giriş yapacak</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Şifre *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                  className="h-11 border-gray-300 focus:border-indigo-600 focus:ring-indigo-600"
                />
                <p className="text-xs text-gray-500">En az 8 karakter olmalı</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                  Şifre (Tekrar) *
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                  className="h-11 border-gray-300 focus:border-indigo-600 focus:ring-indigo-600"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? 'Oluşturuluyor...' : (
                  <>
                    Kullanıcı Oluştur ve Devam Et
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="w-full"
              >
                Geri Dön
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

