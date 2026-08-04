import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700',
  secondary: 'bg-brand-100 text-brand-800 hover:bg-brand-200',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50',
  ghost: 'text-zinc-600 hover:bg-zinc-100',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs min-h-9',
  md: 'px-4 py-2.5 text-sm min-h-11',
  lg: 'px-5 py-3 text-base min-h-12',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}
