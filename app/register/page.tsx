'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Activity, User } from 'lucide-react'
import { TR } from '@/lib/constants/tr'

export default function RegisterPage() {
  const [selectedRole, setSelectedRole] = useState<'owner' | 'trainer' | null>(null)

  if (selectedRole) {
    return null // Will redirect via Link
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Activity className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">{TR.auth.register}</CardTitle>
          <CardDescription>
            {TR.auth.selectRole}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/register/owner">
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col items-center justify-center space-y-2 hover:bg-blue-50 hover:border-blue-600"
            >
              <Activity className="h-8 w-8 text-blue-600" />
              <div className="text-center">
                <div className="font-semibold">{TR.auth.owner}</div>
                <div className="text-xs text-gray-500">At sahibi olarak kayıt olun</div>
              </div>
            </Button>
          </Link>

          <Link href="/register/trainer">
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col items-center justify-center space-y-2 hover:bg-green-50 hover:border-green-600"
            >
              <User className="h-8 w-8 text-green-600" />
              <div className="text-center">
                <div className="font-semibold">{TR.auth.trainer}</div>
                <div className="text-xs text-gray-500">Antrenör olarak kayıt olun</div>
              </div>
            </Button>
          </Link>

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

