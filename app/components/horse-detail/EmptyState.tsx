'use client'

import { Card, CardContent } from '@/app/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  /**
   * card: renders inside its own card surface (default, ideal for mobile)
   * inline: renders within an existing container (ideal for desktop tables)
   */
  variant?: 'card' | 'inline'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  variant = 'card',
}: EmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center gap-3 text-center">
      <Icon className="h-12 w-12 text-gray-400" />
      <p className="text-gray-700 font-semibold">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  )

  if (variant === 'inline') {
    return (
      <div className="w-full py-10 px-4">
        {content}
      </div>
    )
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
      <CardContent className="py-16">{content}</CardContent>
    </Card>
  )
}

