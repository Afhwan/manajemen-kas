'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface NavItem {
  href: string
  label: string
  icon: ReactNode
}

export function BottomNav({
  items,
  pathname,
}: {
  items: NavItem[]
  pathname: string
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                active ? 'text-brand-600' : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              <span className={cn('transition-transform', active && 'scale-105')}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
