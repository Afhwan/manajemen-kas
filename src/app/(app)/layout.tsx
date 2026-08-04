'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSessionUser, type SessionUser } from '@/lib/session'
import { cn, initials } from '@/lib/utils'
import { ToastProvider } from '@/components/ui/Toast'
import { BottomNav, type NavItem } from '@/components/ui/BottomNav'
import type { UserRole } from '@/lib/types'

const NAV: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/members',
    label: 'Anggota',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
        <path d="M16 5a3.5 3.5 0 0 1 0 7M18 20a5.5 5.5 0 0 0-3-4.9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/transactions',
    label: 'Transaksi',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 7h13m0 0-3-3m3 3-3 3M17 17H4m0 0 3 3m-3-3 3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/iuran',
    label: 'Iuran',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v9M14.8 9.3c-.5-.8-1.6-1.3-2.8-1.3-1.7 0-3 .9-3 2.2 0 2.8 5.6 1.5 5.6 4.1 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.6-2.9-1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/reports',
    label: 'Laporan',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 20V4M4 20h16" strokeLinecap="round" />
        <rect x="7" y="12" width="3" height="6" rx="0.5" />
        <rect x="12" y="8" width="3" height="10" rx="0.5" />
        <rect x="17" y="5" width="3" height="13" rx="0.5" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Pengaturan',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    ),
  },
]

const ROLE_LABEL: Record<UserRole, string> = {
  bendahara: 'Bendahara',
  walikelas: 'Walikelas',
}

function SidebarContent({
  pathname,
  navItems,
  user,
  onLogout,
}: {
  pathname: string
  navItems: NavItem[]
  user: SessionUser
  onLogout: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white font-bold text-brand-700 shadow-sm">
          K
        </div>
        <div>
          <p className="font-display text-base font-bold text-white">Kas Kelas</p>
          <p className="text-xs text-rose-200/70">Kelola Duit Kas</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-rose-100/80 hover:bg-white/5 hover:text-white'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white">
            {initials(user.username)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-rose-50">{user.username}</p>
            <p className="text-[10px] text-rose-200/70">{ROLE_LABEL[user.role]}</p>
            <button
              onClick={onLogout}
              className="text-xs font-medium text-rose-200 hover:text-white hover:underline"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    getSessionUser()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isBendahara = user?.role !== 'walikelas'
  const navItems = isBendahara
    ? NAV
    : NAV.filter((i) => i.href === '/dashboard' || i.href === '/reports')

  const current = navItems.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + '/')
  )

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-zinc-50">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 shrink-0 border-r border-white/5 bg-gradient-to-b from-brand-900 to-brand-950 md:block">
          <div className="sticky top-0 h-screen">
            <SidebarContent
              pathname={pathname}
              navItems={navItems}
              user={
                user ?? { id: '', username: 'Pengguna', email: '', role: 'bendahara' }
              }
              onLogout={handleLogout}
            />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar mobile */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 font-display text-sm font-bold text-white">
                K
              </div>
              <span className="truncate font-display text-base font-bold text-zinc-900">
                {current?.label ?? 'Kas Kelas'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isBendahara ? (
                <Link
                  href="/settings"
                  aria-label="Pengaturan"
                  className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                  </svg>
                </Link>
              ) : null}
              <button
                onClick={handleLogout}
                aria-label="Keluar"
                className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-8">
            {children}
          </main>
        </div>

        {/* Bottom nav mobile */}
        <BottomNav items={navItems} pathname={pathname} />
      </div>
    </ToastProvider>
  )
}
