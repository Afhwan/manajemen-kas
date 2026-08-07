import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah, formatDate } from '@/lib/utils'

interface KasRecent {
  date: string
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string | null
}

interface KasSummary {
  class_name: string | null
  academic_year: string | null
  balance: number
  month_income: number
  month_expense: number
  iuran_total: number
  iuran_paid: number
  recent: KasRecent[] | null
}

export default async function PublicKasPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_kas_summary')

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-maroon-200 bg-white/80 p-8 text-center">
          <p className="font-display text-lg font-semibold text-maroon-700">Data tidak tersedia</p>
          <p className="mt-2 text-sm text-zinc-600">
            Halaman transparansi belum dapat dimuat. Coba lagi beberapa saat.
          </p>
        </div>
      </div>
    )
  }

  const summary = (data ?? null) as KasSummary | null
  const className = summary?.class_name ?? 'Manajemen Kas XI Sija'
  const academicYear = summary?.academic_year
  const balance = summary?.balance ?? 0
  const monthIncome = summary?.month_income ?? 0
  const monthExpense = summary?.month_expense ?? 0
  const iuranTotal = summary?.iuran_total ?? 0
  const iuranPaid = summary?.iuran_paid ?? 0
  const iuranPct = iuranTotal > 0 ? Math.round((iuranPaid / iuranTotal) * 100) : 0
  const recent = summary?.recent ?? []

  return (
    <div className="min-h-dvh px-4 py-6 md:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-maroon-600">Manajemen Kas XI Sija</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-ink md:text-3xl">
              {className}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">{academicYear ?? 'Tahun Ajaran'}</p>
          </div>
          <Link
            href="/login"
            className="shrink-0 rounded-lg border border-maroon-600 px-4 py-2 text-sm font-medium text-maroon-700 transition-colors hover:bg-maroon-600 hover:text-paper"
          >
            Login
          </Link>
        </header>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white/70 shadow-sm">
          <div className="border-b-4 border-maroon-600 px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Saldo Kas</p>
            <p className="mt-1 font-display text-3xl font-semibold text-maroon-700">
              {formatRupiah(balance)}
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-zinc-100">
            <div className="px-6 py-4">
              <p className="text-xs text-zinc-500">Pemasukan Bulan Ini</p>
              <p className="mt-1 font-display text-lg font-semibold text-green-700">
                {formatRupiah(monthIncome)}
              </p>
            </div>
            <div className="px-6 py-4">
              <p className="text-xs text-zinc-500">Pengeluaran Bulan Ini</p>
              <p className="mt-1 font-display text-lg font-semibold text-maroon-700">
                {formatRupiah(monthExpense)}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white/70 px-6 py-5 shadow-sm">
          <div className="mb-2 flex items-end justify-between">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Progres Iuran Bulan Ini</p>
            <p className="text-sm text-zinc-600">
              {iuranPaid}/{iuranTotal} lunas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-green-600 transition-all"
                style={{ width: `${iuranPct}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-display text-lg font-semibold text-ink">
              {iuranPct}%
            </span>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white/70 shadow-sm">
          <div className="border-b border-zinc-100 px-6 py-4">
            <p className="font-display text-lg font-semibold text-ink">Transaksi Terakhir</p>
          </div>
          {recent.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-zinc-500">
              Belum ada transaksi tercatat.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recent.map((t, i) => (
                <li key={`${t.date}-${i}`} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {t.description || t.category || 'Transaksi'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(t.date)}
                      {t.category ? ` · ${t.category}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-display text-sm font-semibold ${
                      t.type === 'income' ? 'text-green-700' : 'text-maroon-700'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}
                    {formatRupiah(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-6 pb-4 text-center text-xs text-zinc-400">
          Transparansi keuangan kelas
        </footer>
      </div>
    </div>
  )
}
