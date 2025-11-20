'use client'

import { useAuth } from '@/lib/context/auth-context'
import { RegistrationsCard } from '@/app/components/dashboard/registrations-card'
import { GallopsCard } from '@/app/components/dashboard/gallops-card'
import { RecentRacesCard } from '@/app/components/dashboard/recent-races-card'
import { RecentExpensesCard } from '@/app/components/dashboard/recent-expenses-card'

export default function HomePage() {
  const { isOwner, isTrainer } = useAuth()

  return (
    <div className="space-y-8">
      {/* Dashboard Activity Cards - Recent Updates */}
      {(isOwner || isTrainer) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <RecentRacesCard />
          <RegistrationsCard />
          <GallopsCard />
          <RecentExpensesCard />
        </div>
      )}
    </div>
  )
}

