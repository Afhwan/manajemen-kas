const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
export function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function formatMonthLabel(dateStr: string) {
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`)
  return `${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`
}

export function formatMonthShort(idx: number) {
  return MONTHS_ID[idx].slice(0, 3)
}

export function firstDayOfMonth(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
}

export function periodFromDate(d: Date) {
  return firstDayOfMonth(d.getFullYear(), d.getMonth())
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
