import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Users, Activity, MapPin, Building } from 'lucide-react'

export default function AdminPage() {
  const sections = [
    {
      title: 'Kullanıcı Yönetimi',
      description: 'Kullanıcıları görüntüle ve yönet',
      icon: Users,
      href: '/admin/users',
    },
    {
      title: 'Atlar',
      description: 'Tüm atları görüntüle ve düzenle',
      icon: Activity,
      href: '/admin/horses',
    },
    {
      title: 'Hipodromlar',
      description: 'Hipodrom listesini yönet',
      icon: MapPin,
      href: '/admin/racecourses',
    },
    {
      title: 'Çiftlikler',
      description: 'Çiftlik listesini yönet',
      icon: Building,
      href: '/admin/farms',
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <Icon className="h-8 w-8 mb-2 text-indigo-600" />
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}


