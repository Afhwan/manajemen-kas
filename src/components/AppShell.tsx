'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import type { UserRole } from '@/lib/types'

interface NavItem {
  href: string
  label: string
  icon: string
}

const ALL_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '⌂' },
  { href: '/members', label: 'Anggota', icon: '◉' },
  { href: '/transactions', label: 'Transaksi', icon: '±' },
  { href: '/iuran', label: 'Iuran', icon: '✓' },
  { href: '/reports', label: 'Laporan', icon: '≡' },
]

const SUPERADMIN_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '⌂' },
  { href: '/members', label: 'Anggota', icon: '◉' },
  { href: '/transactions', label: 'Transaksi', icon: '±' },
  { href: '/iuran', label: 'Iuran', icon: '✓' },
  { href: '/reports', label: 'Laporan', icon: '≡' },
  { href: '/pengguna', label: 'Pengguna', icon: '☰' },
]

function navItemsFor(role: UserRole): NavItem[] {
  if (role === 'superadmin') return SUPERADMIN_ITEMS
  if (role === 'walikelas') return ALL_ITEMS.filter((i) => i.href !== '/members' && i.href !== '/transactions' && i.href !== '/iuran' && i.href !== '/settings')
  return ALL_ITEMS
}

export function AppShell({
  role,
  username,
  classInfo,
  children,
}: {
  role: UserRole
  username: string
  classInfo: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const items = navItemsFor(role)
  const isSuperadmin = role === 'superadmin'
  const canEdit = role === 'bendahara'

  return (
    <div className="min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-zinc-200 bg-paper-deep/80 md:flex">
        <div className="border-b border-zinc-200 px-5 py-5">
          <p className="font-display text-xl font-semibold text-maroon-700">Kas Kelas</p>
          <p className="mt-1 text-xs text-zinc-500">{classInfo}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                  active
                    ? 'bg-maroon-600 text-paper'
                    : 'text-zinc-600 hover:bg-zinc-200/70 hover:text-ink'
                }`}
              >
                <span className="font-display text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-zinc-200 px-5 py-4">
          <p className="text-sm font-medium text-ink">{username}</p>
          <p className="text-xs capitalize text-zinc-500">{role}</p>
          {canEdit ? (
            <Link
              href="/settings"
              className="mt-2 block text-xs text-maroon-700 hover:underline"
            >
              Pengaturan
            </Link>
          ) : null}
          {isSuperadmin ? (
            <Link href="/pengguna" className="mt-2 block text-xs text-maroon-700 hover:underline">
              Kelola Pengguna
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => logout()}
            className="mt-2 block text-xs text-zinc-500 hover:text-red-700 hover:underline"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* Top bar mobile */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-paper/95 px-4 py-3 backdrop-blur md:hidden">
        <div>
          <p className="font-display text-lg font-semibold text-maroon-700">Kas Kelas</p>
          <p className="text-[11px] text-zinc-500">{classInfo}</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit ? (
            <Link
              href="/settings"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-sm text-zinc-600"
              aria-label="Pengaturan"
            >
              ⚙
            </Link>
          ) : null}
          {isSuperadmin ? (
            <Link
              href="/pengguna"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-sm text-zinc-600"
              aria-label="Kelola Pengguna"
            >
              ⊕
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => logout()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-sm text-zinc-600"
            aria-label="Keluar"
          >
            ↪
          </button>
        </div>
      </header>

      <main className="px-4 pb-24 pt-5 md:ml-60 md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      {/* Bottom nav mobile */}
      <div className="no-print md:hidden">
        <BottomNavComponent items={items} />
      </div>
    </div>
  )
}

function BottomNavComponent({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-paper/95 backdrop-blur">
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <BottomLink key={item.href} item={item} />
        ))}
      </div>
    </nav>
  )
}

function BottomLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
  return (
    <Link
      href={item.href}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${
        active ? 'text-maroon-700' : 'text-zinc-500'
      }`}
    >
      <span className="font-display text-lg leading-none">{item.icon}</span>
      {item.label}
    </Link>
  )
}
