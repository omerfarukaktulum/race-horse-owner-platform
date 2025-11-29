'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Shield, LogIn } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminSignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, adminCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Giriş başarısız')
      }

      // Verify the cookie is set by checking auth status
      let cookieVerified = false
      let retries = 0
      const maxRetries = 5

      while (!cookieVerified && retries < maxRetries) {
        try {
          const verifyResponse = await fetch('/api/auth/me', {
            credentials: 'include',
            cache: 'no-store',
          })

          if (verifyResponse.ok) {
            cookieVerified = true
            break
          }
        } catch (verifyError) {
          console.error('Cookie verification error:', verifyError)
        }

        retries++
        if (!cookieVerified && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      if (!cookieVerified) {
        throw new Error('Kimlik doğrulama başarısız. Lütfen tekrar deneyin.')
      }

      toast.success('Giriş başarılı')
      
      // Redirect to admin dashboard
      setTimeout(() => {
        window.location.href = '/admin'
      }, 500)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Giriş başarısız'
      toast.error(message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-700">
              Admin Girişi
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Admin hesabınızla giriş yapın
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 border-gray-300 focus:border-indigo-600 focus:ring-indigo-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Şifre
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 border-gray-300 focus:border-indigo-600 focus:ring-indigo-600"
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
                className="h-11 border-gray-300 focus:border-indigo-600 focus:ring-indigo-600"
              />
              <p className="text-xs text-gray-500">Admin erişimi için gerekli</p>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? 'Giriş yapılıyor...' : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Giriş Yap
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

