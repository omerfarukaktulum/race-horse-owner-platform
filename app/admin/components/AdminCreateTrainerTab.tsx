'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { UserCheck, ArrowRight } from 'lucide-react'

export default function AdminCreateTrainerTab() {
  const router = useRouter()

  return (
    <div className="flex justify-center">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center shadow-lg">
              <UserCheck className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-emerald-700">
            Yeni Antrenör Oluştur
          </CardTitle>
          <CardDescription className="text-center text-gray-600 mt-2">
            Antrenör hesabı oluşturmak ve TJK&apos;dan antrenör seçmek için başlatın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Antrenör oluşturma işlemi şu adımlardan oluşur:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 ml-2">
              <li>Kullanıcı email ve şifresi oluşturma</li>
              <li>TJK&apos;dan antrenör seçme</li>
              <li>Antrenör profili oluşturma</li>
            </ul>
            <p className="text-xs text-gray-500 mt-4">
              Not: Antrenör, sahipler tarafından eküriye eklenecektir.
            </p>
            <Button
              onClick={() => router.push('/admin/create-trainer')}
              className="w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Başlat
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

