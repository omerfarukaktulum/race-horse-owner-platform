'use client'

import { AuthProvider } from '@/lib/context/auth-context'
import { ErrorProvider } from '@/lib/context/error-context'
import { useAuth } from '@/lib/context/auth-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, DollarSign, TrendingUp, Settings, LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { TR } from '@/lib/constants/tr'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

function AppNavbar() {
  const { user, signOut, isOwner } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [stablemateName, setStablemateName] = useState<string | null>(null)

  useEffect(() => {
    const fetchStablemate = async () => {
      if (!isOwner) return
      
      try {
        const response = await fetch('/api/onboarding/stablemate', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.stablemate?.name) {
            setStablemateName(data.stablemate.name)
          }
        }
      } catch (error) {
        console.error('Error fetching stablemate:', error)
      }
    }

    fetchStablemate()
  }, [isOwner])

  const navItems = [
    { href: '/app/home', label: TR.nav.home, icon: Activity },
    { href: '/app/horses', label: TR.nav.horses, icon: Activity },
    { href: '/app/expenses', label: TR.nav.expenses, icon: DollarSign },
    { href: '/app/stats', label: TR.nav.statistics, icon: TrendingUp },
  ]

  if (isOwner) {
    navItems.push(
      { href: '/app/stablemate', label: TR.nav.stablemate, icon: Settings },
      { href: '/app/billing', label: TR.nav.billing, icon: DollarSign }
    )
  }

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/app/home" className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg">
              {stablemateName ? `${stablemateName} EKÜRİSİ` : 'TJK Stablemate'}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={pathname?.startsWith(item.href) ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-2">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>{TR.auth.signOut}</span>
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
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <AppNavbar />
      <main className="container mx-auto px-4 py-8">
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

