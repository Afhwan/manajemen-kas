import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ExportCsvButton } from '@/components/ExportCsvButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { computeBalance, formatMonthPeriod, formatRupiah } from '@/lib/utils'

export default async function ReportsPage() {
  const supabase = await createClient()

  const [{ data: transactions }, { data: iurans }, { data: members }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, type, amount, transaction_date, description, categories(name)')
      .order('transaction_date', { ascending: false }),
    supabase
      .from('iurans')
      .select('id, member_id, period, amount, status, members(name)')
      .order('period', { ascending: false }),
    supabase.from('members').select('id, name, nis, is_active'),
  ])

  const tx = (transactions ?? []) as {
    id: string
    type: 'income' | 'expense'
    amount: number
    transaction_date: string
    description: string
    categories?: { name?: string }[] | null
  }[]
  const balance = computeBalance(tx)

  // Rekap per bulan
  const monthMap = new Map<string, { masuk: number; keluar: number; count: number }>()
  tx.forEach((t) => {
    const key = t.transaction_date.slice(0, 7)
    const cur = monthMap.get(key) ?? { masuk: 0, keluar: 0, count: 0 }
    cur.count += 1
    if (t.type === 'income') cur.masuk += t.amount
    else cur.keluar += t.amount
    monthMap.set(key, cur)
  })
  const monthly = [...monthMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, v]) => ({ key, ...v, selisih: v.masuk - v.keluar }))

  // Rekap per kategori
  const catMap = new Map<string, { name: string; masuk: number; keluar: number }>()
  tx.forEach((t) => {
    const name = t.categories?.[0]?.name ?? 'Tanpa kategori'
    const cur = catMap.get(name) ?? { name, masuk: 0, keluar: 0 }
    if (t.type === 'income') cur.masuk += t.amount
    else cur.keluar += t.amount
    catMap.set(name, cur)
  })
  const categories = [...catMap.values()].sort((a, b) => b.masuk + b.keluar - (a.masuk + a.keluar))

  // Rekap per anggota (iuran)
  const memberMap = new Map<string, { name: string; total: number; paid: number; amount: number }>()
  ;(iurans ?? []).forEach((i) => {
    const name = (i.members as { name?: string }[] | null)?.[0]?.name ?? '—'
    const cur = memberMap.get(i.member_id) ?? { name, total: 0, paid: 0, amount: 0 }
    cur.total += 1
    cur.amount += i.amount
    if (i.status === 'paid') cur.paid += i.amount
    memberMap.set(i.member_id, cur)
  })
  const memberRecap = [...memberMap.values()].sort((a, b) => b.paid - a.paid)

  const totalMembers = members?.length ?? 0
  const activeMembers = members?.filter((m) => m.is_active).length ?? 0

  return (
    <div>
      <PageHeader
        title="Laporan"
        subtitle="Rekapitulasi keuangan kelas"
        action={
          <ExportCsvButton
            rows={tx.map((t) => ({
              date: t.transaction_date,
              type: t.type,
              category: t.categories?.[0]?.name ?? '',
              description: t.description,
              amount: t.amount,
            }))}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Saldo Kas" value={formatRupiah(balance)} tone="maroon" />
        <SummaryCard
          label="Total Pemasukan"
          value={formatRupiah(tx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0))}
          tone="green"
        />
        <SummaryCard
          label="Total Pengeluaran"
          value={formatRupiah(tx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
          tone="red"
        />
        <SummaryCard
          label="Anggota (Aktif/Total)"
          value={`${activeMembers}/${totalMembers}`}
          tone="zinc"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Rekap Bulanan" />
          <CardContent className="p-0">
            {monthly.length === 0 ? (
              <EmptyState title="Belum ada data" description="Belum ada transaksi yang dicatat." />
            ) : (
              <Table
                head={['Bulan', 'Pemasukan', 'Pengeluaran', 'Selisih']}
                rows={monthly.map((m) => [
                  formatMonthPeriod(`${m.key}-01`),
                  fmt(m.masuk),
                  fmt(m.keluar),
                  m.selisih >= 0 ? fmt(m.selisih) : `-${fmt(Math.abs(m.selisih))}`,
                ])}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Rekap per Kategori" />
          <CardContent className="p-0">
            {categories.length === 0 ? (
              <EmptyState title="Belum ada data" description="Belum ada transaksi yang dicatat." />
            ) : (
              <Table
                head={['Kategori', 'Pemasukan', 'Pengeluaran']}
                rows={categories.map((c) => [
                  c.name,
                  fmt(c.masuk),
                  fmt(c.keluar),
                ])}
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Rekap Iuran per Anggota" />
          <CardContent className="p-0">
            {memberRecap.length === 0 ? (
              <EmptyState title="Belum ada data" description="Belum ada catatan iuran." />
            ) : (
              <div className="divide-y divide-zinc-100">
                {memberRecap.map((m) => {
                  const pct = m.amount > 0 ? Math.round((m.paid / m.amount) * 100) : 0
                  return (
                    <div key={m.name} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{m.name}</p>
                        <p className="text-xs text-zinc-500">
                          {m.total} bulan · {formatRupiah(m.paid)} dari {formatRupiah(m.amount)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-200">
                          <div className="h-full bg-green-600" style={{ width: `${pct}%` }} />
                        </div>
                        <Badge variant={pct === 100 ? 'green' : 'zinc'}>{pct}%</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function fmt(n: number) {
  return formatRupiah(n)
}

function SummaryCard({
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
        <p className={`mt-1 truncate font-display text-base font-semibold md:text-lg ${tones[tone]}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
            {head.map((h) => (
              <th key={h} className="px-5 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-zinc-50">
              {r.map((c, j) => (
                <td key={j} className="px-5 py-3 text-ink">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
