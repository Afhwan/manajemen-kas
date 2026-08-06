import { redirect } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.rpc('get_app_user', { p_uid: user.id })
  const row = (profile ?? null) as { username?: string; role?: string } | null
  if (!row?.role) redirect('/login')

  const { data: classInfo } = await supabase
    .from('class_info')
    .select('class_name, academic_year')
    .single()

  const className = classInfo?.class_name ? String(classInfo.class_name) : ''
  const academicYear = classInfo?.academic_year ? String(classInfo.academic_year) : ''
  const classLabel = className || academicYear ? `${className} · ${academicYear}` : 'Buku Kas Kelas'

  return (
    <AppShell
      role={row.role as 'bendahara' | 'walikelas' | 'superadmin'}
      username={row.username ?? user.email ?? ''}
      classInfo={classLabel}
    >
      {children}
    </AppShell>
  )
}
