'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  generateIuranPeriod,
  markAllIuranPaid,
  markIuranPaid,
} from '@/app/actions/iurans'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { fetchClassInfo, fetchIurans } from '@/lib/queries'
import type { Iuran } from '@/lib/types'
import { currentMonthPeriod, formatMonthPeriod, formatRupiah } from '@/lib/utils'

export default function IuranPage() {
  const { toast } = useToast()
  const [iurans, setIurans] = useState<Iuran[] | null>(null)
  const [period, setPeriod] = useState(currentMonthPeriod())
  const [busy, setBusy] = useState(false)
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([currentMonthPeriod()])
  const [iuranAmount, setIuranAmount] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let ignore = false
    async function load() {
      const [data, classInfo] = await Promise.all([fetchIurans(), fetchClassInfo()])
      if (ignore) return
      setIurans(data)
      setIuranAmount(classInfo?.iuran_amount ?? null)

      const periods = new Set<string>([currentMonthPeriod()])
      data.forEach((i) => periods.add(i.period))
      setAvailablePeriods([...periods].sort().reverse())
    }
    load()
    return () => {
      ignore = true
    }
  }, [refreshKey])

  const periodData = useMemo(
    () => (iurans ? iurans.filter((i) => i.period === period) : []),
    [iurans, period]
  )

  const paidCount = periodData.filter((i) => i.status === 'paid').length
  const total = periodData.length
  const pct = total > 0 ? Math.round((paidCount / total) * 100) : 0

  async function handleGenerate() {
    setBusy(true)
    const result = await generateIuranPeriod(period)
    if (result && 'error' in result) {
      toast(result.error as string, 'error')
      setBusy(false)
      return
    }
    setBusy(false)
    toast(`Iuran ${formatMonthPeriod(period)} berhasil dibuat.`)
    setRefreshKey((k) => k + 1)
  }

  async function handleToggle(i: Iuran) {
    const result = await markIuranPaid(i.id, i.status !== 'paid')
    if (result && 'error' in result) {
      toast(result.error as string, 'error')
      return
    }
    toast(i.status === 'paid' ? 'Iuran dibatalkan.' : 'Iuran ditandai lunas.')
    setRefreshKey((k) => k + 1)
  }

  async function handleMarkAll() {
    setBusy(true)
    const result = await markAllIuranPaid(period)
    if (result && 'error' in result) {
      toast(result.error as string, 'error')
      setBusy(false)
      return
    }
    setBusy(false)
    toast('Semua iuran ditandai lunas.')
    setRefreshKey((k) => k + 1)
  }

  if (!iurans) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Iuran"
        subtitle={`Nominal iuran: ${iuranAmount !== null ? formatRupiah(iuranAmount) : '—'} per siswa`}
        action={
          total > 0 ? (
            <Button variant="outline" onClick={handleMarkAll} disabled={busy || paidCount === total}>
              Tandai Semua Lunas
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Periode</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-ink focus:border-maroon-500 focus:outline-2 focus:outline-maroon-500/30"
          >
            {availablePeriods.map((p) => (
              <option key={p} value={p}>
                {formatMonthPeriod(p)}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handleGenerate} disabled={busy}>
          Buat Iuran Bulan Ini
        </Button>
      </div>

      {total > 0 ? (
        <div className="mb-4 rounded-xl border border-green-600/30 bg-green-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-green-700">
              {paidCount} dari {total} siswa sudah lunas
            </span>
            <span className="font-semibold text-green-700">{pct}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-green-100">
            <div
              className="h-full rounded-full bg-green-600"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}

      <Card>
        {periodData.length === 0 ? (
          <EmptyState
            title="Belum ada iuran untuk periode ini"
            description="Klik 'Buat Iuran Bulan Ini' untuk membuat catatan iuran semua anggota."
          />
        ) : (
          <CardContent className="p-0">
            <ul className="divide-y divide-zinc-100">
              {periodData.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {i.members?.name ?? '—'}
                    </p>
                    <p className="text-xs text-zinc-500">{formatRupiah(i.amount)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {i.status === 'paid' ? (
                      <Badge variant="green" stamp>
                        Lunas
                      </Badge>
                    ) : (
                      <Badge variant="zinc">Belum</Badge>
                    )}
                    <Button
                      variant={i.status === 'paid' ? 'ghost' : 'outline'}
                      size="sm"
                      onClick={() => handleToggle(i)}
                      disabled={busy}
                    >
                      {i.status === 'paid' ? 'Batalkan' : 'Lunasi'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
