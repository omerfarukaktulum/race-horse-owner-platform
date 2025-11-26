'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { UserPlus, CheckCircle2 } from 'lucide-react'
import { TR } from '@/lib/constants/tr'

export default function RegisterRequestPage() {
  const [nameSurname, setNameSurname] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    setIsSubmitted(true)
    setIsLoading(false)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                Kayıt Başvurusu Alındı
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Kayıt başvurunuz alınmıştır, en kısa sürede sizinle iletişime geçeceğiz
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button className="w-full h-11 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                Geri Dön
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              {TR.auth.register}
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Kayıt olmak için bilgilerinizi doldurun
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nameSurname" className="text-gray-700 font-medium">
                Ad Soyad
              </Label>
              <Input
                id="nameSurname"
                type="text"
                placeholder="Adınız ve soyadınız"
                value={nameSurname}
                onChange={(e) => setNameSurname(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 border-gray-300 focus:border-[#6366f1] focus:ring-[#6366f1]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                {TR.auth.email}
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
              <Label htmlFor="telephone" className="text-gray-700 font-medium">
                Telefon Numarası
              </Label>
              <Input
                id="telephone"
                type="tel"
                placeholder="05XX XXX XX XX"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
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
              {isLoading ? TR.common.loading : TR.auth.register}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Zaten hesabınız var mı? </span>
            <Link 
              href="/signin" 
              className="text-[#6366f1] hover:text-[#4f46e5] font-semibold hover:underline transition-colors"
            >
              {TR.auth.signIn}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

