import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-zinc-200 bg-white shadow-sm', className)}>
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
      <div>
        <h3 className="font-display text-base font-semibold text-zinc-900">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-5', className)}>{children}</div>
}
