"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface ErrorContextType {
  showError: (error: Error, retryFunction?: () => void | Promise<void>) => void
  hideError: () => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

interface ErrorProviderProps {
  children: ReactNode
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [isErrorOpen, setIsErrorOpen] = useState(false)
  const [currentError, setCurrentError] = useState<Error | null>(null)
  const [retryFunction, setRetryFunction] = useState<(() => void | Promise<void>) | undefined>(undefined)

  const showError = (error: Error, retryFn?: () => void | Promise<void>) => {
    console.error('Global error caught:', error)
    setCurrentError(error)
    setRetryFunction(() => retryFn)
    setIsErrorOpen(true)
  }

  const hideError = () => {
    setIsErrorOpen(false)
    setCurrentError(null)
    setRetryFunction(undefined)
  }

  return (
    <ErrorContext.Provider value={{ showError, hideError }}>
      {children}
      {/* Error modal will be added later with UI components */}
    </ErrorContext.Provider>
  )
}

export function useError() {
  const context = useContext(ErrorContext)
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}






