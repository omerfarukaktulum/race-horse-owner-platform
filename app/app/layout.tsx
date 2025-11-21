'use client'

import { AuthProvider } from '@/lib/context/auth-context'
import { ErrorProvider } from '@/lib/context/error-context'
import { useAuth } from '@/lib/context/auth-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, TurkishLira, BarChart3, Settings, LogOut, Menu, X, UserPlus, User, FileText, ChessKnight } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { TR } from '@/lib/constants/tr'
import { useState, useEffect } from 'react'

function AppNavbar() {
  const { user, signOut, isOwner, isTrainer } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [stablemateName, setStablemateName] = useState<string | null>(null)
  const [ownerOfficialRef, setOwnerOfficialRef] = useState<string | null>(null)
  const [trainerName, setTrainerName] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!isOwner) return
      
      try {
        // Fetch user data to get officialRef
        const userResponse = await fetch('/api/auth/me', {
          credentials: 'include',
        })
        
        if (userResponse.ok) {
          const userData = await userResponse.json()
          if (userData.user?.ownerProfile?.officialRef) {
            setOwnerOfficialRef(userData.user.ownerProfile.officialRef)
          }
        }

        // Fetch stablemate name
        const stablemateResponse = await fetch('/api/onboarding/stablemate', {
          credentials: 'include',
        })
        
        if (stablemateResponse.ok) {
          const stablemateData = await stablemateResponse.json()
          if (stablemateData.stablemate?.name) {
            setStablemateName(stablemateData.stablemate.name)
          }
        }
      } catch (error) {
        console.error('Error fetching user/stablemate data:', error)
      }
    }

    fetchUserData()

    // Listen for stablemate name updates
    const handleStablemateNameUpdate = (event: CustomEvent) => {
      if (event.detail?.name) {
        setStablemateName(event.detail.name)
      }
    }

    window.addEventListener('stablemateNameUpdated', handleStablemateNameUpdate as EventListener)
    
    return () => {
      window.removeEventListener('stablemateNameUpdated', handleStablemateNameUpdate as EventListener)
    }
  }, [isOwner])

  useEffect(() => {
    const fetchTrainerData = async () => {
      if (!isTrainer) return

      try {
        const response = await fetch('/api/trainer/account', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setTrainerName(data.trainer?.fullName ?? null)
        }
      } catch (error) {
        console.error('Error fetching trainer account data:', error)
      }
    }

    fetchTrainerData()
  }, [isTrainer])

  const navItems = [
    { href: '/app/home', label: TR.nav.home, icon: Home },
    { href: '/app/horses', label: TR.nav.horses, icon: ChessKnight },
    { href: '/app/stats', label: TR.nav.statistics, icon: BarChart3 },
    { href: '/app/expenses', label: TR.nav.expenses, icon: TurkishLira },
    { href: '/app/notes', label: TR.nav.notes, icon: FileText },
  ]

  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/app/home" className="flex items-center space-x-2">
            {isOwner && ownerOfficialRef ? (
              <div className="h-8 w-8 flex-shrink-0 relative flex items-center justify-center">
                <img
                  src={`https://medya-cdn.tjk.org/formaftp/${ownerOfficialRef}.jpg`}
                  alt="Eküri Forması"
                  className="h-8 w-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const container = e.currentTarget.parentElement
                    if (container) {
                      const icon = container.querySelector('.fallback-icon') as HTMLElement
                      if (icon) icon.style.display = 'block'
                    }
                  }}
                />
                <UserPlus className="h-8 w-8 text-[#6366f1] fallback-icon hidden" />
              </div>
            ) : isTrainer ? (
              <User className="h-6 w-6 text-[#6366f1] flex-shrink-0" />
            ) : (
              <LayoutGrid className="h-6 w-6 text-[#6366f1] flex-shrink-0" />
            )}
            <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              {isOwner
                ? stablemateName
                  ? `${stablemateName} EKÜRİSİ`
                  : 'EKÜRİM'
                : isTrainer
                ? trainerName || 'Antrenör Paneli'
                : 'EKÜRİM'}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:flex-1 md:items-center md:justify-center md:space-x-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex items-center gap-2 ${
                    pathname?.startsWith(item.href)
                      ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  } transition-all`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isOwner && (
              <Link href="/app/stablemate">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                    pathname?.startsWith('/app/stablemate') ? 'bg-indigo-50 text-indigo-600' : ''
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  {TR.nav.stablemate}
                </Button>
              </Link>
            )}
            {isTrainer && (
              <Link href="/app/trainer/account">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                    pathname?.startsWith('/app/trainer/account') ? 'bg-indigo-50 text-indigo-600' : ''
                  }`}
                >
                  <User className="h-4 w-4" />
                  Hesap
                </Button>
              </Link>
            )}
            <Button
              onClick={signOut}
              className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white rounded-lg px-6 py-2 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {TR.auth.signOut}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={pathname?.startsWith(item.href) ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              ))}
              {isOwner && (
                <Link href="/app/stablemate">
                  <Button
                    variant={pathname?.startsWith('/app/stablemate') ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {TR.nav.stablemate}
                  </Button>
                </Link>
              )}
              {isTrainer && (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <Link href="/app/trainer/account">
                    <Button
                      variant={pathname?.startsWith('/app/trainer/account') ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Hesap
                    </Button>
                  </Link>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2">
                  <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    signOut()
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {TR.auth.signOut}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex flex-col">
      <AppNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full min-w-0">
        {children}
      </main>
      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} Nordiys. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  )
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <ErrorProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </ErrorProvider>
    </AuthProvider>
  )
}

