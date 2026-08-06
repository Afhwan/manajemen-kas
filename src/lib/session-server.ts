import { createClient } from '@/lib/supabase/server'
import type { SessionUser } from '@/lib/types'

export async function getServerSession(): Promise<SessionUser | null> {
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user?.email) return null

  const { data } = await client.rpc('get_app_user', { p_uid: user.id })

  if (!data) return null

  const row = data as { username?: string; role?: string }

  return {
    id: user.id,
    username: row.username ?? user.email,
    email: user.email,
    role: (row.role as SessionUser['role']) ?? 'bendahara',
  }
}
