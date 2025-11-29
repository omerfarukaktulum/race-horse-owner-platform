'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Shield } from 'lucide-react'
import { toast } from 'sonner'

export default function RegisterAdminPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!adminCode.trim()) {
      toast.error('Admin kodu gerekli')
      return
    }

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
      // Verify admin code and create user account
      const codeResponse = await fetch('/api/auth/verify-admin-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: adminCode,
          email,
          password,
        }),
      })

      const codeData = await codeResponse.json()

      if (!codeResponse.ok) {
        throw new Error(codeData.error || 'Admin kodu geçersiz veya hesap oluşturulamadı')
      }

      toast.success('Hesap oluşturuldu ve giriş yapıldı')
      
      // Redirect to admin dashboard (admin onboarding is at /admin/create-owner)
      setTimeout(() => {
        window.location.href = '/admin'
      }, 500)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'İşlem başarısız'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              Admin - Hesap Oluşturma
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Admin kodu ile hesap oluşturun ve eküri kurulumuna başlayın
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
              />
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
                className="h-11 border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
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
                className="h-11 border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminCode" className="text-gray-700 font-medium">
                Admin Kodu *
              </Label>
              <Input
                id="adminCode"
                type="password"
                placeholder="Admin kodunu girin"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? 'Oluşturuluyor...' : 'Hesap Oluştur'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

