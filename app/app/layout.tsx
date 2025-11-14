'use client'

import { AuthProvider } from '@/lib/context/auth-context'
import { ErrorProvider } from '@/lib/context/error-context'
import { useAuth } from '@/lib/context/auth-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, TurkishLira, BarChart3, Settings, LogOut, Menu, X, ChevronDown, User } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { TR } from '@/lib/constants/tr'
import { useState, useEffect } from 'react'

function AppNavbar() {
  const { user, signOut, isOwner } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [stablemateName, setStablemateName] = useState<string | null>(null)
  const [ownerOfficialRef, setOwnerOfficialRef] = useState<string | null>(null)

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
  }, [isOwner])

  const navItems = [
    { href: '/app/home', label: TR.nav.home, icon: Home },
    { href: '/app/horses', label: TR.nav.horses, icon: LayoutGrid },
    { href: '/app/expenses', label: TR.nav.expenses, icon: TurkishLira },
    { href: '/app/stats', label: TR.nav.statistics, icon: BarChart3 },
  ]

  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/app/home" className="flex items-center space-x-2">
            {ownerOfficialRef ? (
              <img
                src={`https://medya-cdn.tjk.org/formaftp/${ownerOfficialRef}.jpg`}
                alt="Eküri Forması"
                className="h-8 w-8 object-contain flex-shrink-0"
                onError={(e) => {
                  // Hide image on error, show icon instead
                  e.currentTarget.style.display = 'none'
                  const icon = e.currentTarget.nextElementSibling as HTMLElement
                  if (icon) icon.style.display = 'block'
                }}
              />
            ) : null}
            <LayoutGrid 
              className={`h-6 w-6 text-[#6366f1] flex-shrink-0 ${ownerOfficialRef ? 'hidden' : ''}`}
            />
            <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
              {stablemateName ? `${stablemateName} EKÜRİSİ` : 'EKÜRİM'}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:flex-1 md:items-center md:justify-center md:space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 ${
                  pathname?.startsWith(item.href)
                    ? 'text-indigo-600 font-medium border-b-2 border-indigo-600 pb-1'
                    : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300 pb-1'
                } transition-all`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isOwner && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  onBlur={() => setTimeout(() => setAccountMenuOpen(false), 200)}
                >
                  <User className="h-4 w-4" />
                  <span>Hesap</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </Button>
                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <Link href="/app/stablemate">
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        {TR.nav.stablemate}
                      </button>
                    </Link>
                    <Link href="/app/billing">
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        <TurkishLira className="h-4 w-4" />
                        {TR.nav.billing}
                      </button>
                    </Link>
                  </div>
                )}
              </div>
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
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Hesap
                    </p>
                  </div>
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
                  <Link href="/app/billing">
                    <Button
                      variant={pathname?.startsWith('/app/billing') ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <TurkishLira className="h-4 w-4 mr-2" />
                      {TR.nav.billing}
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50">
      <AppNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
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

