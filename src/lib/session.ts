import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

export interface SessionUser {
  id: string
  username: string
  email: string
  role: UserRole
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const client = createClient()
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
