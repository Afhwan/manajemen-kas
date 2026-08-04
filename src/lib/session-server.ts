import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'
import type { SessionUser } from '@/lib/session'

export async function getServerSession(): Promise<SessionUser | null> {
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user?.email) return null

  const { data } = await client
    .from('app_users')
    .select('username, role')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    username: (data?.username as string | undefined) ?? user.email,
    email: user.email,
    role: (data?.role as UserRole | undefined) ?? 'bendahara',
  }
}
