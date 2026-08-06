import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-zinc-300 font-display text-2xl text-zinc-300">
        ±
      </div>
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-sm text-sm text-zinc-500">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
