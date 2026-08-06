'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/app/actions/guard'
import type { UserRole } from '@/lib/types'

function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export async function listAppUsers() {
  const guard = await requireSuperadmin()
  if (guard) return { error: guard.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('app_users')
    .select('id, username, email, role, created_at')
    .order('username', { ascending: true })

  if (error) return { error: error.message }
  return { users: data }
}

export async function createUser(formData: FormData) {
  const guard = await requireSuperadmin()
  if (guard) return guard

  const username = String(formData.get('username') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const role = String(formData.get('role') ?? '')

  if (!username) return { error: 'Username wajib diisi.' }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return { error: 'Username hanya boleh huruf kecil, angka, titik, garis bawah, dan strip.' }
  }
  if (password.length < 6) return { error: 'Password minimal 6 karakter.' }
  if (role !== 'bendahara' && role !== 'superadmin') {
    return { error: 'Role tidak valid.' }
  }

  const email = `${username}@kas-kelas.test`
  const admin = createAdminClient()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) return { error: createError.message }

  // Trigger sudah membuat baris app_users (role default bendahara).
  // Perbarui role sesuai pilihan.
  const { error: updateError } = await admin
    .from('app_users')
    .update({ role: role as UserRole })
    .eq('id', created.user.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/pengguna')
}

export async function updateUserRole(userId: string, role: string) {
  const guard = await requireSuperadmin()
  if (guard) return guard

  if (role !== 'bendahara' && role !== 'superadmin') {
    return { error: 'Role tidak valid.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('app_users')
    .update({ role: role as UserRole })
    .eq('id', userId)
  if (error) return { error: error.message }
  revalidatePath('/pengguna')
}

export async function resetUserPassword(userId: string, password: string) {
  const guard = await requireSuperadmin()
  if (guard) return guard

  if (password.length < 6) return { error: 'Password minimal 6 karakter.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return { error: error.message }
  revalidatePath('/pengguna')
}

export async function deleteUser(userId: string) {
  const guard = await requireSuperadmin()
  if (guard) return guard

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId, true)
  if (error) return { error: error.message }
  revalidatePath('/pengguna')
}
