'use client'

import dynamic from 'next/dynamic'

const TrendChart = dynamic(
  () =>
    import('@/components/TrendChart').then((m) => m.TrendChart),
  { ssr: false, loading: () => <div className="h-56 animate-pulse rounded-lg bg-zinc-100" /> }
)

export function ChartWrapper({ data }: { data: { label: string; masuk: number; keluar: number }[] }) {
  return <TrendChart data={data} />
}
