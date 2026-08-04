'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { fetchClassInfo, fetchIurans, fetchMembers, fetchTransactions } from '@/lib/queries'
import { formatIDR, formatMonthLabel, formatMonthShort, periodFromDate } from '@/lib/utils'
import type { ClassInfo, Iuran, Member, Transaction } from '@/lib/types'

function exportCSV(filename: string, rows: string[][]) {
  const blob = new Blob(
    [rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')],
    { type: 'text/csv;charset=utf-8' }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [info, setInfo] = useState<ClassInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [txs, setTxs] = useState<Transaction[]>([])
  const [iurans, setIurans] = useState<Iuran[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [i, m, t, ir] = await Promise.all([
      fetchClassInfo(),
      fetchMembers(false),
      fetchTransactions({ limit: 10000 }),
      fetchIurans(),
    ])
    setInfo(i)
    setMembers(m)
    setTxs(t)
    setIurans(ir)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const monthStart = periodFromDate(new Date(year, month, 1))
  const monthEnd = periodFromDate(new Date(year, month + 1, 1))
  const monthTx = txs.filter((t) => t.transaction_date >= monthStart && t.transaction_date < monthEnd)
  const monthIn = monthTx.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const monthOut = monthTx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)

  const monthIurans = iurans.filter((i) => i.period === monthStart && i.status === 'paid')
  const monthIuranTotal = monthIurans.length * (info?.iuran_amount ?? 0)

  const yearTx = txs.filter((t) => t.transaction_date.startsWith(String(year)))
  const yearIn = yearTx.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const yearOut = yearTx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    monthTx.forEach((t) => {
      const name = t.categories?.name ?? 'Lain-lain'
      map.set(name, (map.get(name) ?? 0) + t.amount)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [monthTx])

  const iuranByMember = useMemo(() => {
    const map = new Map<string, { name: string; paid: number; total: number }>()
    members.forEach((m) => map.set(m.id, { name: m.name, paid: 0, total: 0 }))
    iurans.forEach((i) => {
      const entry = map.get(i.member_id)
      if (!entry) return
      entry.total++
      if (i.status === 'paid') entry.paid++
    })
    return Array.from(map.entries())
  }, [members, iurans])

  if (loading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Laporan"
        subtitle={`Periode: ${formatMonthLabel(monthStart)} ${year}`}
      >
        <div className="flex gap-2">
          <select
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from({ length: 3 }, (_, i) => year - 1 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>{formatMonthLabel(new Date(year, i, 1))}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCSV(
                `laporan-${monthStart}.csv`,
                [
                  ['Bulan', 'Pemasukan', 'Pengeluaran', 'Saldo', 'Iuran Terkumpul'],
                  [formatMonthLabel(monthStart), String(monthIn), String(monthOut), String(monthIn - monthOut), String(monthIuranTotal)],
                ]
              )
            }
          >
            Unduh CSV
          </Button>
        </div>
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Pemasukan</p>
          <p className="mt-1 text-lg font-bold text-emerald-600">{formatIDR(monthIn)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Pengeluaran</p>
          <p className="mt-1 text-lg font-bold text-red-600">{formatIDR(monthOut)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Saldo Bulan Ini</p>
          <p className="mt-1 text-lg font-bold text-zinc-900">{formatIDR(monthIn - monthOut)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Iuran Terkumpul</p>
          <p className="mt-1 text-lg font-bold text-zinc-900">{formatIDR(monthIuranTotal)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Rincian Pengeluaran per Kategori" />
          {categoryBreakdown.length === 0 ? (
            <CardContent><p className="py-4 text-center text-sm text-zinc-400">Tidak ada pengeluaran bulan ini.</p></CardContent>
          ) : (
            <CardContent className="p-0">
              <ul className="divide-y divide-zinc-100">
                {categoryBreakdown.map(([name, total]) => (
                  <li key={name} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-zinc-700">{name}</span>
                    <span className="text-sm font-semibold text-red-600">{formatIDR(total)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader title="Rekap Iuran per Anggota" />
          {iuranByMember.length === 0 ? (
            <CardContent><p className="py-4 text-center text-sm text-zinc-400">Tidak ada data iuran.</p></CardContent>
          ) : (
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400">
                      <th className="px-4 py-3 font-medium">Nama</th>
                      <th className="px-4 py-3 text-right font-medium">Lunas</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                      <th className="px-4 py-3 text-right font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {iuranByMember.map(([id, d]) => (
                      <tr key={id}>
                        <td className="px-4 py-3 font-medium text-zinc-800">{d.name}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{d.paid}</td>
                        <td className="px-4 py-3 text-right">{d.total}</td>
                        <td className="px-4 py-3 text-right">
                          {d.total > 0 ? (
                            <Badge variant="green">{Math.round((d.paid / d.total) * 100)}%</Badge>
                          ) : (
                            <Badge variant="zinc">—</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Rekap Tahunan" subtitle={String(year)} />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-4 py-3 font-medium">Bulan</th>
                  <th className="px-4 py-3 text-right font-medium">Pemasukan</th>
                  <th className="px-4 py-3 text-right font-medium">Pengeluaran</th>
                  <th className="px-4 py-3 text-right font-medium">Saldo</th>
                  <th className="px-4 py-3 text-right font-medium">Iuran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {Array.from({ length: 12 }, (_, i) => {
                  const mStart = periodFromDate(new Date(year, i, 1))
                  const mEnd = periodFromDate(new Date(year, i + 1, 1))
                  const mTx = txs.filter((t) => t.transaction_date >= mStart && t.transaction_date < mEnd)
                  const mIn = mTx.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)
                  const mOut = mTx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
                  const mIuran = iurans.filter((ir) => ir.period === mStart && ir.status === 'paid').length * (info?.iuran_amount ?? 0)
                  return (
                    <tr key={i} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-700">{formatMonthShort(i)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{mIn > 0 ? formatIDR(mIn) : '—'}</td>
                      <td className="px-4 py-3 text-right text-red-600">{mOut > 0 ? formatIDR(mOut) : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatIDR(mIn - mOut)}</td>
                      <td className="px-4 py-3 text-right">{mIuran > 0 ? formatIDR(mIuran) : '—'}</td>
                    </tr>
                  )
                })}
                <tr className="border-t-2 border-zinc-300 bg-zinc-50">
                  <td className="px-4 py-3 font-bold text-zinc-900">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatIDR(yearIn)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatIDR(yearOut)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatIDR(yearIn - yearOut)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatIDR(iurans.filter((ir) => ir.status === 'paid').length * (info?.iuran_amount ?? 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}