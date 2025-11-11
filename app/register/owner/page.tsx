'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Activity } from 'lucide-react'
import { toast } from 'sonner'
import { TR } from '@/lib/constants/tr'

export default function RegisterOwnerPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
      const response = await fetch('/api/auth/register/owner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kayıt başarısız')
      }

      toast.success('Kayıt başarılı! Giriş yapılıyor...')
      
      // Auto sign in
      const signInResponse = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (signInResponse.ok) {
        // Use window.location for hard redirect to ensure cookie is included
        setTimeout(() => {
          window.location.href = '/onboarding/owner-lookup'
        }, 500)
      } else {
        setTimeout(() => {
          window.location.href = '/signin'
        }, 500)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kayıt başarısız'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Activity className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Sahip Kaydı</CardTitle>
          <CardDescription>
            At sahibi olarak kayıt olun
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{TR.auth.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{TR.auth.password}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifre (Tekrar)</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? TR.common.loading : TR.auth.register}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">Zaten hesabınız var mı? </span>
            <Link href="/signin" className="text-blue-600 hover:underline font-medium">
              {TR.auth.signIn}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

