'use client'

import * as React from 'react'

/**
 * Prevents focusable elements (selects, date pickers) inside a modal from
 * auto-opening when the modal itself mounts. The guard is automatically
 * released after the provided delay or can be released manually via the
 * returned `unlock` function.
 */
export function useModalInteractionGuard(open: boolean, delay = 400) {
  const [isGuarded, setIsGuarded] = React.useState(open)

  React.useEffect(() => {
    if (!open) {
      setIsGuarded(false)
      return
    }

    setIsGuarded(true)
    const timer = window.setTimeout(() => {
      setIsGuarded(false)
    }, delay)

    return () => window.clearTimeout(timer)
  }, [open, delay])

  const unlock = React.useCallback(() => setIsGuarded(false), [])

  const guardPointerEvent = React.useCallback(
    (event: React.SyntheticEvent<HTMLElement>) => {
      if (!isGuarded) return
      event.preventDefault()
      event.stopPropagation()
    },
    [isGuarded]
  )

  const guardFocusEvent = React.useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      if (!isGuarded) return
      event.preventDefault()
      event.stopPropagation()
      const target = event.target as HTMLElement
      window.setTimeout(() => target.blur(), 0)
    },
    [isGuarded]
  )

  return {
    isGuarded,
    guardPointerEvent,
    guardFocusEvent,
    unlock,
  }
}


