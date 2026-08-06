'use client'

interface CsvRow {
  date: string
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
}

export function ExportCsvButton({ rows }: { rows: CsvRow[] }) {
  function handleExport() {
    const header = ['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Nominal']
    const body = rows.map((r) => [
      r.date,
      r.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      r.category,
      r.description,
      String(r.amount),
    ])
    const csv = [header, ...body]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'laporan-transaksi.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex min-h-11 items-center rounded-lg bg-maroon-600 px-4 text-sm font-medium text-paper hover:bg-maroon-700"
    >
      Export CSV
    </button>
  )
}
