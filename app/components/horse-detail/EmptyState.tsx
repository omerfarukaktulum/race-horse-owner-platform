'use client'

import { Card, CardContent } from '@/app/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
      <CardContent className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <Icon className="h-12 w-12 text-gray-400" />
          <p className="text-gray-700 font-semibold">{title}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

