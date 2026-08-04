import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type BadgeVariant = 'green' | 'red' | 'amber' | 'blue' | 'zinc'

const variants: Record<BadgeVariant, string> = {
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  zinc: 'bg-zinc-100 text-zinc-600',
}

export function Badge({
  variant = 'zinc',
  className,
  children,
}: {
  variant?: BadgeVariant
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
