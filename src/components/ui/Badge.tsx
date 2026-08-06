import type { ReactNode } from 'react'

type Variant = 'green' | 'maroon' | 'zinc' | 'gold' | 'outline'

const variants: Record<Variant, string> = {
  green: 'border-green-600 text-green-700',
  maroon: 'border-maroon-600 text-maroon-700',
  zinc: 'border-zinc-300 text-zinc-600',
  gold: 'border-gold-600 text-gold-600',
  outline: 'border-zinc-300 text-zinc-600',
}

export function Badge({
  children,
  variant = 'zinc',
  stamp = false,
  className = '',
}: {
  children: ReactNode
  variant?: Variant
  stamp?: boolean
  className?: string
}) {
  if (stamp) {
    return (
      <span
        className={`inline-block border-2 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-widest ${variants[variant]} ${className}`}
        style={stamp ? { transform: 'rotate(-3deg)' } : undefined}
      >
        {children}
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
