'use client'

import { AuthProvider } from '@/lib/context/auth-context'
import { ErrorProvider } from '@/lib/context/error-context'
import { useAuth } from '@/lib/context/auth-context'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Home, LayoutGrid, TurkishLira, BarChart3, Settings, LogOut, Menu, X, UserPlus, User, FileText, ChessKnight } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { TR } from '@/lib/constants/tr'
import { useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

function AppNavbar() {
  const { user, signOut, isOwner, isTrainer } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [currentPath, setCurrentPath] = useState(pathname)
  
  // Update current path when pathname changes
  useEffect(() => {
    setCurrentPath(pathname)
  }, [pathname])
  
  // Handle navigation with immediate state update
  const handleNavClick = (href: string) => {
    // Force immediate state update for instant visual feedback
    flushSync(() => {
      setCurrentPath(href)
    })
    router.push(href)
  }
  const [stablemateName, setStablemateName] = useState<string | null>(null)
  const [ownerOfficialRef, setOwnerOfficialRef] = useState<string | null>(null)
  const [trainerName, setTrainerName] = useState<string | null>(null)
  const [horseName, setHorseName] = useState<string | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Clear all state when user logs out
  useEffect(() => {
    if (!user) {
      setStablemateName(null)
      setOwnerOfficialRef(null)
      setTrainerName(null)
      setHorseName(null)
      setIsLoadingData(false)
    }
  }, [user])

  useEffect(() => {
    const fetchUserData = async () => {
      if (!isOwner) {
        setIsLoadingData(false)
        // Clear state when user is not an owner
        setStablemateName(null)
        setOwnerOfficialRef(null)
        return
      }
      
      setIsLoadingData(true)
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
        // Clear state on error
        setStablemateName(null)
        setOwnerOfficialRef(null)
      } finally {
        setIsLoadingData(false)
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
      if (!isTrainer) {
        // Clear state when user is not a trainer
        setTrainerName(null)
        return
      }

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
        // Clear state on error
        setTrainerName(null)
      }
    }

    fetchTrainerData()
  }, [isTrainer])

  useEffect(() => {
    const fetchHorseName = async () => {
      // Check if we're on a horse detail page
      const horseIdMatch = pathname?.match(/^\/app\/horses\/([^\/]+)$/)
      if (!horseIdMatch) {
        setHorseName(null)
        return
      }

      const horseId = horseIdMatch[1]
      try {
        const response = await fetch(`/api/horses/${horseId}`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          if (data.horse?.name) {
            setHorseName(data.horse.name)
          }
        }
      } catch (error) {
        console.error('Error fetching horse name:', error)
        setHorseName(null)
      }
    }

    fetchHorseName()
  }, [pathname])

  const navItems = [
    { href: '/app/home', label: TR.nav.home, icon: Home },
    { href: '/app/horses', label: TR.nav.horses, icon: ChessKnight },
    { href: '/app/stats', label: TR.nav.statistics, icon: BarChart3 },
    { href: '/app/expenses', label: TR.nav.expenses, icon: TurkishLira },
    { href: '/app/notes', label: TR.nav.notes, icon: FileText },
  ]

  return (
    <header className="border-b border-gray-200 bg-white backdrop-blur-sm fixed top-0 left-0 right-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/app/home" className="flex items-center space-x-2">
            {isOwner && !isLoadingData && ownerOfficialRef ? (
              <div className="h-12 w-12 flex-shrink-0 relative flex items-center justify-center -mt-2 overflow-hidden">
                <Image
                  src={`https://medya-cdn.tjk.org/formaftp/${ownerOfficialRef}.jpg`}
                  alt="Eküri Forması"
                  width={48}
                  height={48}
                  className="object-contain w-full h-full max-w-full max-h-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const container = e.currentTarget.parentElement
                    if (container) {
                      const icon = container.querySelector('.fallback-icon') as HTMLElement
                      if (icon) icon.style.display = 'block'
                    }
                  }}
                  unoptimized
                />
                <UserPlus className="h-8 w-8 text-[#6366f1] fallback-icon hidden absolute" />
              </div>
            ) : isOwner && isLoadingData ? (
              <div className="h-12 w-12 flex-shrink-0 flex items-center justify-center -mt-0.5">
                <div className="h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : isTrainer ? (
              <User className="h-6 w-6 text-[#6366f1] flex-shrink-0" />
            ) : (
              <LayoutGrid className="h-6 w-6 text-[#6366f1] flex-shrink-0" />
            )}
            <span className="font-bold text-md bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#4f46e5] leading-tight">
              {isOwner
                ? isLoadingData
                  ? 'Yükleniyor...'
                  : stablemateName
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
                  className={`flex items-center gap-2 ${
                    pathname?.startsWith('/app/stablemate')
                      ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  } transition-all`}
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
                  className={`flex items-center gap-2 ${
                    pathname?.startsWith('/app/trainer/account')
                      ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  } transition-all`}
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

          {/* Mobile: Settings and Logout buttons */}
          <div className="md:hidden flex items-center gap-3">
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavClick('/app/stablemate')}
                className={`flex flex-col items-center gap-1 p-2 h-auto bg-transparent hover:bg-transparent active:bg-transparent focus:bg-transparent ${currentPath?.startsWith('/app/stablemate') ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <Settings className="h-5 w-5" />
                <span className="text-xs font-medium">Eküri</span>
              </Button>
            )}
            {isTrainer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavClick('/app/trainer/account')}
                className={`flex flex-col items-center gap-1 p-2 h-auto bg-transparent hover:bg-transparent active:bg-transparent focus:bg-transparent ${currentPath?.startsWith('/app/trainer/account') ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <User className="h-5 w-5" />
                <span className="text-xs font-medium">Hesap</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="flex flex-col items-center gap-1 p-2 h-auto text-gray-600 hover:text-red-600"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-xs font-medium">Çıkış</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

function BottomTabBar() {
  const pathname = usePathname()
  const { isOwner, isTrainer } = useAuth()
  const [isVisible, setIsVisible] = useState(true)
  const scrollPositionsRef = useRef<Map<Element | Window, number>>(new Map())

  // Update CSS variable when tab bar visibility changes
  useEffect(() => {
    if (typeof document === 'undefined') return
    const tabBarHeight = 56 // Height of tab bar in pixels (reduced to match icon style)
    const padding = 8 // Small padding buffer
    // When visible: tab bar height + padding, when hidden: just padding for safe area
    const totalHeight = isVisible ? tabBarHeight + padding : padding
    document.documentElement.style.setProperty('--bottom-tab-bar-height', `${totalHeight}px`)
  }, [isVisible])

  useEffect(() => {
    if (typeof window === 'undefined') return

    let ticking = false
    const SCROLL_THRESHOLD = 5 // Minimum scroll difference to trigger show/hide
    
    const handleScroll = (element: Element | Window) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isWindow = element === window
          const currentScrollY = isWindow 
            ? window.scrollY 
            : (element as Element).scrollTop
          
          const lastScrollY = scrollPositionsRef.current.get(element) || 0
          const scrollDifference = Math.abs(currentScrollY - lastScrollY)
          
          // Show tab bar when at top
          if (currentScrollY < 10) {
            setIsVisible(true)
          } else if (scrollDifference > SCROLL_THRESHOLD) {
            // Hide when scrolling down, show when scrolling up
            setIsVisible(currentScrollY < lastScrollY)
          }
          
          scrollPositionsRef.current.set(element, currentScrollY)
          ticking = false
        })
        ticking = true
      }
    }

    // Handle window scroll
    const windowScrollHandler = () => handleScroll(window)
    window.addEventListener('scroll', windowScrollHandler, { passive: true })

    // Find and handle scrollable containers (optimized to check main content areas)
    const findScrollableContainers = () => {
      const containers: Element[] = []
      
      // Check main content area first (most common scrollable container)
      const main = document.querySelector('main')
      if (main) {
        const style = window.getComputedStyle(main)
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && main.scrollHeight > main.clientHeight) {
          containers.push(main)
        }
      }
      
      // Check for common scrollable container patterns
      const commonSelectors = [
        '[class*="overflow"]',
        '[style*="overflow"]',
        'div[class*="scroll"]',
      ]
      
      commonSelectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector)
          elements.forEach((el) => {
            const style = window.getComputedStyle(el)
            const overflowY = style.overflowY
            const hasScroll = overflowY === 'auto' || overflowY === 'scroll'
            
            if (hasScroll && el.scrollHeight > el.clientHeight && !containers.includes(el)) {
              containers.push(el)
            }
          })
        } catch (e) {
          // Ignore invalid selectors
        }
      })
      
      return containers
    }

    // Set up listeners for scrollable containers
    const setupContainerListeners = () => {
      const containers = findScrollableContainers()
      const handlers: Array<{ element: Element; handler: () => void }> = []
      
      containers.forEach((container) => {
        // Skip if already has a listener (avoid duplicates)
        if (scrollPositionsRef.current.has(container)) return
        
        const handler = () => handleScroll(container)
        container.addEventListener('scroll', handler, { passive: true })
        handlers.push({ element: container, handler })
        scrollPositionsRef.current.set(container, container.scrollTop)
      })
      
      return handlers
    }

    // Initial setup
    let containerHandlers = setupContainerListeners()
    let setupTimeout: ReturnType<typeof setTimeout> | null = null
    
    // Re-setup periodically and on pathname change
    const scheduleRescan = () => {
      if (setupTimeout) clearTimeout(setupTimeout)
      setupTimeout = setTimeout(() => {
        // Clean up old handlers
        containerHandlers.forEach(({ element, handler }) => {
          element.removeEventListener('scroll', handler)
        })
        // Set up new handlers
        containerHandlers = setupContainerListeners()
      }, 500) // Debounce rescan
    }
    
    const observer = new MutationObserver(scheduleRescan)
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
    
    // Also rescan after a delay when pathname changes
    scheduleRescan()
    
    return () => {
      window.removeEventListener('scroll', windowScrollHandler)
      containerHandlers.forEach(({ element, handler }) => {
        element.removeEventListener('scroll', handler)
      })
      observer.disconnect()
      if (setupTimeout) clearTimeout(setupTimeout)
      scrollPositionsRef.current.clear()
    }
  }, [pathname])

  if (!isOwner && !isTrainer) {
    return null
  }

  const navItems = [
    { href: '/app/home', label: TR.nav.home, icon: Home },
    { href: '/app/horses', label: TR.nav.horses, icon: ChessKnight },
    { href: '/app/stats', label: TR.nav.statistics, icon: BarChart3 },
    { href: '/app/expenses', label: TR.nav.expenses, icon: TurkishLira },
    { href: '/app/notes', label: TR.nav.notes, icon: FileText },
  ]

  const isActive = (href: string) => {
    if (href === '/app/home') {
      return pathname === '/app/home'
    }
    return pathname?.startsWith(href)
  }

  return (
    <nav 
      className={`bottom-tab-bar md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] safe-area-inset-bottom transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div 
        className="flex flex-row items-center justify-around h-14 min-h-[56px] px-2 pb-safe" 
        style={{ 
          flexDirection: 'row',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: '56px',
          minHeight: '56px'
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              scroll={true}
              className="bottom-tab-item flex flex-col items-center justify-center flex-1 h-full min-w-0 max-w-[20%] transition-all duration-200 active:scale-95"
              style={{ 
                flexDirection: 'column',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <div className={`relative flex-shrink-0 ${active ? 'scale-105' : 'scale-100'} transition-transform duration-200`} style={{ flexShrink: 0 }}>
                <item.icon className={`h-5 w-5 ${active ? 'text-indigo-600' : 'text-gray-500'}`} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span 
                className={`text-xs font-medium leading-tight text-center whitespace-nowrap overflow-hidden text-ellipsis ${active ? 'text-indigo-600 font-semibold' : 'text-gray-500'}`}
                style={{ 
                  display: 'block',
                  textAlign: 'center',
                  width: '100%'
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Scroll to top when pathname changes (new page loads)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex flex-col">
      <AppNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full min-w-0 pt-20 pb-20 md:pb-20">
        {children}
      </main>
      {/* Desktop Footer */}
      <footer className="hidden md:block fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} Nordiys. Tüm hakları saklıdır.</p>
        </div>
      </footer>
      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar />
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

