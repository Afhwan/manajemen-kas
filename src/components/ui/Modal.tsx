'use client'

import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const WIDTHS: Record<string, string> = {
  'max-w-md': 'sm:max-w-md',
  'max-w-lg': 'sm:max-w-lg',
  'max-w-xl': 'sm:max-w-xl',
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          'sheet-up relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-2xl',
          WIDTHS[maxWidth] ?? 'sm:max-w-lg'
        )}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
          <h3 className="font-display text-base font-semibold text-zinc-900">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <div className="p-5 pb-8 sm:pb-5">{children}</div>
      </div>
    </div>
  )
}
