"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { useAuth } from '@/lib/context/auth-context'
import { Menu, X, Activity } from 'lucide-react'
import { TR } from '@/lib/constants/tr'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, isLoading, isInitialized } = useAuth()
  const [stablemateName, setStablemateName] = useState<string | null>(null)

  useEffect(() => {
    const fetchStablemateName = async () => {
      if (!user || user.role !== 'OWNER') return
      
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
        console.error('Error fetching stablemate name:', error)
      }
    }

    if (isInitialized && user) {
      fetchStablemateName()
    }
  }, [user, isInitialized])

  const getNavigationItems = () => {
    if (!isInitialized || !user) {
      return []
    }

    const items = [
      { href: '/app/home', label: TR.nav.home },
      { href: '/app/horses', label: TR.nav.horses },
      { href: '/app/expenses', label: TR.nav.expenses },
      { href: '/app/stats', label: TR.nav.statistics },
    ]

    return items
  }

  const navigationItems = getNavigationItems()

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      window.location.href = '/signin'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <nav className="bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href={user ? '/app/home' : '/'} className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-[#6366f1]" />
              {stablemateName ? (
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 whitespace-nowrap">
                  {stablemateName} Ekürisi
                </p>
              ) : (
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5]">
                  At Sahibi Platform
                </span>
              )}
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          {user && (
            <div className="hidden md:flex md:flex-1 md:items-center md:justify-center md:space-x-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${
                    pathname === item.href
                      ? 'text-indigo-600 font-medium border-b-2 border-indigo-600 pb-1'
                      : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300 pb-1'
                  } transition-all`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side buttons */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {!isInitialized || isLoading ? (
              <div className="w-24 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
            ) : user ? (
              <>
                <span className="text-sm text-gray-600">
                  {user.fullName}
                </span>
                <Button
                  onClick={handleSignOut}
                  className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white rounded-lg px-6 py-2 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {TR.auth.signOut}
                </Button>
              </>
            ) : (
              <>
                <Link href="/signin">
                  <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                    {TR.auth.signIn}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#5558e5] hover:to-[#4338ca] text-white">
                    {TR.auth.register}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          {user && (
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <span className="sr-only">Open menu</span>
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {isMenuOpen && user && (
          <div className="md:hidden">
            <div className="pt-2 pb-4 space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname === item.href
                      ? 'text-indigo-600 bg-indigo-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="px-3 py-2 border-t border-gray-200 mt-2">
                <p className="text-sm text-gray-500 mb-2">{user.fullName}</p>
                <button
                  onClick={() => {
                    handleSignOut()
                    setIsMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                >
                  {TR.auth.signOut}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}


