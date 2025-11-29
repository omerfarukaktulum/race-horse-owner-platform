'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import { Button } from '@/app/components/ui/button'
import { RegistrationsCard } from '@/app/components/dashboard/registrations-card'
import { GallopsCard } from '@/app/components/dashboard/gallops-card'
import { RecentRacesCard } from '@/app/components/dashboard/recent-races-card'
import { RecentExpensesCard } from '@/app/components/dashboard/recent-expenses-card'
import { Menu, X, Trophy, Calendar, Activity, TurkishLira } from 'lucide-react'

type DashboardSection = 'races' | 'registrations' | 'gallops' | 'expenses'

export default function HomePage() {
  const { isOwner, isTrainer } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState<DashboardSection>('races')
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const menuItems = [
    { id: 'races' as const, label: 'Koşular', icon: Trophy },
    { id: 'registrations' as const, label: 'Kayıtlar', icon: Calendar },
    { id: 'gallops' as const, label: 'İdmanlar', icon: Activity },
    { id: 'expenses' as const, label: 'Giderler', icon: TurkishLira },
  ]

  const handleSectionSelect = (section: DashboardSection) => {
    setSelectedSection(section)
    setIsMenuOpen(false)
  }

  const showCard = (cardType: DashboardSection) => {
    return selectedSection === cardType
  }

  return (
    <div className="space-y-8">
      {/* Dashboard Activity Cards - Recent Updates */}
      {(isOwner || isTrainer) && (
        <>
          {/* Desktop: Show all cards in grid */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <RecentRacesCard />
            <RegistrationsCard />
            <GallopsCard />
            <RecentExpensesCard />
          </div>

          {/* Mobile: Show selected card only */}
          <div className="md:hidden space-y-6">
            {showCard('races') && <RecentRacesCard />}
            {showCard('registrations') && <RegistrationsCard />}
            {showCard('gallops') && <GallopsCard />}
            {showCard('expenses') && <RecentExpensesCard />}
          </div>

          {/* Mobile: FAB Button with Menu */}
          <div 
            ref={menuRef}
            className="md:hidden fixed right-4 z-40" 
            style={{ 
              bottom: 'calc(var(--bottom-tab-bar-height, 73px) + 1rem)'
            }}
          >
            {/* Menu Popover */}
            {isMenuOpen && (
              <div
                className="absolute right-0 bottom-full mb-2 min-w-max bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200/50 p-2 animate-in z-40"
              >
                <div className="flex flex-col gap-1">
                  {menuItems.map(({ id, label, icon: Icon }) => {
                    const isActive = selectedSection === id
                    return (
                      <button
                        key={id}
                        onClick={() => handleSectionSelect(id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                          isActive
                            ? 'bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-md'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* FAB Button */}
            <Button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="h-12 w-12 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center p-0 fab-button"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

