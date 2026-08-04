'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import {
  computeBalance,
  fetchClassInfo,
  fetchIurans,
  fetchMembers,
  fetchTransactions,
} from '@/lib/queries'
import type { ClassInfo, Transaction } from '@/lib/types'
import {
  firstDayOfMonth,
  formatIDR,
  formatMonthShort,
  formatMonthLabel,
  periodFromDate,
} from '@/lib/utils'

function compactIDR(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}jt`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
  return String(v)
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone: 'emerald' | 'blue' | 'red' | 'zinc'
}) {
  const tones = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    zinc: 'bg-zinc-100 text-zinc-700',
  }
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-2 inline-block rounded-lg px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>
        {value}
      </p>
      {sub ? <p className="mt-2 text-xs text-zinc-400">{sub}</p> : null}
    </Card>
  )
}

interface DashboardData {
  info: ClassInfo | null
  balance: number
  monthIn: number
  monthOut: number
  activeCount: number
  paidCount: number
  chart: { label: string; masuk: number; keluar: number }[]
  recent: Transaction[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const period = periodFromDate(new Date())
      const monthStart = period
      const sixMonthsStart = firstDayOfMonth(
        new Date().getFullYear(),
        new Date().getMonth() - 5
      )

      const [info, allTx, members, iurans, recentTx] = await Promise.all([
        fetchClassInfo(),
        fetchTransactions({ limit: 10000 }),
        fetchMembers(false),
        fetchIurans(period),
        fetchTransactions({ limit: 5 }),
      ])

      if (cancelled) return

      const balance = computeBalance(allTx)
      const monthTx = allTx.filter((t) => t.transaction_date >= monthStart)
      const monthIn = monthTx
        .filter((t) => t.type === 'income')
        .reduce((a, t) => a + t.amount, 0)
      const monthOut = monthTx
        .filter((t) => t.type === 'expense')
        .reduce((a, t) => a + t.amount, 0)

      const activeCount = members.length
      const paidCount = iurans.filter((i) => i.status === 'paid').length

      const buckets: { label: string; masuk: number; keluar: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setDate(1)
        d.setMonth(d.getMonth() - i)
        const start = firstDayOfMonth(d.getFullYear(), d.getMonth())
        buckets.push({ label: formatMonthShort(d.getMonth()), masuk: 0, keluar: 0 })
        allTx
          .filter((t) => t.transaction_date.startsWith(start))
          .forEach((t) => {
            if (t.type === 'income') buckets[buckets.length - 1].masuk += t.amount
            else buckets[buckets.length - 1].keluar += t.amount
          })
      }

      setData({ info, balance, monthIn, monthOut, activeCount, paidCount, chart: buckets, recent: recentTx })
    }
    load().catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat data'))
    return () => {
      cancelled = true
    }
  }, [])

  const iuranPct = useMemo(() => {
    if (!data || data.activeCount === 0) return 0
    return Math.round((data.paidCount / data.activeCount) * 100)
  }, [data])

  if (error) {
    return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
  }
  if (!data) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          data.info
            ? `${data.info.class_name} — ${data.info.academic_year}`
            : 'Kas kelas'
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Saldo Kas" value={formatIDR(data.balance)} sub="Saldo terkini" tone="emerald" />
        <StatCard label="Pemasukan Bulan Ini" value={formatIDR(data.monthIn)} sub={formatMonthLabel(new Date().toISOString().slice(0, 10))} tone="blue" />
        <StatCard label="Pengeluaran Bulan Ini" value={formatIDR(data.monthOut)} sub={formatMonthLabel(new Date().toISOString().slice(0, 10))} tone="red" />
        <StatCard label="Siswa Aktif" value={String(data.activeCount)} sub="Anggota kelas" tone="zinc" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Pemasukan vs Pengeluaran" subtitle="6 bulan terakhir" />
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chart} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#a1a1aa"
                    tickFormatter={(v) => compactIDR(Number(v))}
                    width={48}
                  />
                  <Tooltip formatter={(v) => formatIDR(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="masuk" name="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="keluar" name="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Iuran Bulan Ini"
            subtitle={formatMonthLabel(new Date().toISOString().slice(0, 10))}
            action={
              <Link href="/iuran" className="text-xs font-medium text-emerald-600 hover:underline">
                Kelola
              </Link>
            }
          />
          <CardContent>
            <p className="text-3xl font-bold text-zinc-900">
              {data.paidCount}
              <span className="text-base font-medium text-zinc-400"> / {data.activeCount} siswa</span>
            </p>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${iuranPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-400">{iuranPct}% sudah lunas</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Transaksi Terbaru"
          action={
            <Link href="/transactions" className="text-xs font-medium text-emerald-600 hover:underline">
              Lihat semua
            </Link>
          }
        />
        {data.recent.length === 0 ? (
          <CardContent>
            <p className="py-6 text-center text-sm text-zinc-400">Belum ada transaksi.</p>
          </CardContent>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {data.recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800">
                    {t.description || t.categories?.name || 'Transaksi'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {t.categories?.name} · {t.transaction_date}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${
                    t.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {t.type === 'income' ? '+' : '−'} {formatIDR(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
