"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export interface User {
  id: string
  email: string
  role: 'OWNER' | 'TRAINER' | 'ADMIN'
  ownerId?: string
  trainerId?: string
}

export interface AuthContextType {
  user: User | null
  signin: (email: string, password: string) => Promise<void>
  signOut: () => void
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
  isOwner: boolean
  isTrainer: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Yükleniyor...</p>
      </div>
    </div>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error checking user session:', error)
        setUser(null)
      } finally {
        setIsInitialized(true)
      }
    }

    checkUserSession()
  }, [])

  const refreshUser = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else if (response.status === 401) {
        setUser(null)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signin = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Giriş başarısız')
      }

      setUser(data.user)
      toast.success('Giriş başarılı')
      router.push('/app/home')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Giriş başarısız'
      setError(message)
      toast.error(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      setUser(null)
      router.push('/')
      toast.success('Çıkış yapıldı')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Çıkış yapılamadı')
    }
  }

  if (!isInitialized) {
    return <AuthLoadingScreen />
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        signin,
        signOut,
        isLoading,
        isInitialized,
        error,
        refreshUser,
        isAuthenticated: !!user,
        isOwner: user?.role === 'OWNER',
        isTrainer: user?.role === 'TRAINER',
        isAdmin: user?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

