import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
}

export function DropdownMenu({ trigger, children, align = 'right' }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-dropdown]')) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Clone children to pass onClose prop
  const childrenWithClose = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, {
        onClose: () => setOpen(false),
      })
    }
    return child
  })

  return (
    <div className="relative" data-dropdown>
      <div onClick={() => setOpen(!open)}>
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 min-w-[200px] rounded-md border bg-white shadow-lg",
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {childrenWithClose}
        </div>
      )}
    </div>
  )
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
  onClose,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  onClose?: () => void
}) {
  const handleClick = (e: React.MouseEvent) => {
    // If clicking on a link, close the menu after a short delay
    const target = e.target as HTMLElement
    if (target.closest('a')) {
      setTimeout(() => {
        onClose?.()
      }, 100)
    } else {
      onClick?.()
      onClose?.()
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "cursor-pointer px-4 py-2 text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md",
        className
      )}
    >
      {children}
    </div>
  )
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-gray-200 my-1" />
}

