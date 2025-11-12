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
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] rounded-full flex items-center justify-center shadow-lg">
              <Activity className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              {TR.auth.register}
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {TR.auth.selectRole}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/register/owner" className="block">
            <div className="group relative w-full p-6 flex flex-col items-center justify-center space-y-3 border-2 border-gray-200 rounded-xl hover:border-[#6366f1] hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-300 cursor-pointer hover:shadow-lg">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <Activity className="h-7 w-7 text-white" />
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-gray-900">{TR.auth.owner}</div>
                <div className="text-sm text-gray-600 mt-1">At sahibi olarak kayıt olun</div>
              </div>
            </div>
          </Link>

          <Link href="/register/trainer" className="block">
            <div className="group relative w-full p-6 flex flex-col items-center justify-center space-y-3 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-gradient-to-br hover:from-emerald-50/50 hover:to-teal-50/50 transition-all duration-300 cursor-pointer hover:shadow-lg">
              <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                <User className="h-7 w-7 text-white" />
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-gray-900">{TR.auth.trainer}</div>
                <div className="text-sm text-gray-600 mt-1">Antrenör olarak kayıt olun</div>
              </div>
            </div>
          </Link>

          <div className="mt-6 text-center text-sm pt-4 border-t border-gray-200">
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

