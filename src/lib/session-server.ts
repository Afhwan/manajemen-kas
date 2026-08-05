import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'
import type { SessionUser } from '@/lib/session'

export async function getServerSession(): Promise<SessionUser | null> {
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user?.email) return null

  const { data } = await client.rpc('get_app_user', { p_uid: user.id })

  if (!data) return null

  return {
    id: user.id,
    username: (data.username as string | undefined) ?? user.email,
    email: user.email,
    role: (data.role as UserRole | undefined) ?? 'bendahara',
  }
}