import Link from 'next/link'
import { ChartWrapper } from '@/components/ChartWrapper'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah, computeBalance } from '@/lib/utils'

function last6Months(): { start: string; label: string }[] {
  const out: { start: string; label: string }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d),
    })
  }
  return out
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: classInfo }, { data: transactions }, { data: iurans }, { data: members }] =
    await Promise.all([
      supabase.from('class_info').select('*').single(),
      supabase
        .from('transactions')
        .select('id, type, amount, transaction_date, description')
        .order('transaction_date', { ascending: false })
        .limit(500),
      supabase.from('iurans').select('id, status').limit(10000),
      supabase.from('members').select('id, is_active'),
    ])

  const all = transactions ?? []
  const balance = computeBalance(all)

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthTx = all.filter((t) => t.transaction_date >= monthStart)
  const incomeMonth = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenseMonth = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const periods = last6Months()
  const chartData = periods.map((p) => {
    const next = new Date(p.start)
    next.setMonth(next.getMonth() + 1)
    const end = next.toISOString().slice(0, 10)
    const inRange = all.filter((t) => t.transaction_date >= p.start && t.transaction_date < end)
    return {
      label: p.label,
      masuk: inRange.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      keluar: inRange.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    }
  })

  const totalIuran = iurans?.length ?? 0
  const paidIuran = iurans?.filter((i) => i.status === 'paid').length ?? 0
  const iuranPct = totalIuran > 0 ? Math.round((paidIuran / totalIuran) * 100) : 0
  const activeMembers = members?.filter((m) => m.is_active).length ?? 0

  const recent = [...(transactions ?? [])]
    .sort((a, b) => (b.transaction_date > a.transaction_date ? 1 : -1))
    .slice(0, 6)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={classInfo ? `${classInfo.class_name} · ${classInfo.academic_year}` : undefined}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Saldo Kas" value={formatRupiah(balance)} tone="maroon" />
        <StatCard label="Pemasukan Bulan Ini" value={formatRupiah(incomeMonth)} tone="green" />
        <StatCard label="Pengeluaran Bulan Ini" value={formatRupiah(expenseMonth)} tone="red" />
        <StatCard label="Anggota Aktif" value={String(activeMembers)} tone="zinc" />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader title="Tren Keuangan 6 Bulan" subtitle="Pemasukan dan pengeluaran per bulan" />
          <CardContent>
            <ChartWrapper data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Progres Iuran" subtitle={`Bulan ${new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(now)}`} />
          <CardContent>
            <div className="mb-2 flex items-end justify-between">
              <span className="text-2xl font-semibold text-ink">{iuranPct}%</span>
              <span className="text-sm text-zinc-500">
                {paidIuran}/{totalIuran} lunas
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-green-600 transition-all"
                style={{ width: `${iuranPct}%` }}
              />
            </div>
            {iuranPct === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                Belum ada iuran dicatat. Mulai dari halaman Iuran.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Transaksi Terbaru"
          action={
            <Link
              href="/transactions"
              className="text-sm font-medium text-maroon-700 hover:underline"
            >
              Lihat semua
            </Link>
          }
        />
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi"
              description="Catat pemasukan atau pengeluaran pertama di halaman Transaksi."
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{t.description || 'Transaksi'}</p>
                    <p className="text-xs text-zinc-500">{t.transaction_date}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={t.type === 'income' ? 'green' : 'maroon'}>
                      {t.type === 'income' ? 'Masuk' : 'Keluar'}
                    </Badge>
                    <span
                      className={`text-sm font-semibold ${
                        t.type === 'income' ? 'text-green-700' : 'text-maroon-700'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {formatRupiah(t.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'maroon' | 'green' | 'red' | 'zinc'
}) {
  const tones: Record<string, string> = {
    maroon: 'text-maroon-700',
    green: 'text-green-600',
    red: 'text-red-700',
    zinc: 'text-zinc-800',
  }
  return (
    <Card>
      <CardContent className="px-4 py-4">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className={`mt-1 truncate font-display text-lg font-semibold md:text-xl ${tones[tone]}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
