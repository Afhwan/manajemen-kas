'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const identifier = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!identifier || !password) {
    return { error: 'Username sama password wajib diisi dong' }
  }

  const supabase = await createClient()

  let email = ''
  if (identifier.includes('@')) {
    // Bisa langsung pakai email penuh.
    email = identifier.toLowerCase()
  } else {
    // Pakai username -> cari email lewat fungsi di database.
    const { data, error } = await supabase.rpc('get_email_by_username', {
      p_username: identifier.toLowerCase(),
    })
    if (error) {
      return {
        error:
          'Setup belum lengkap nih — pastikan file supabase/migration-username-role.sql sudah dijalankan di Supabase SQL Editor.',
      }
    }
    email = (data as string | null) ?? ''
  }

  if (!email) {
    return { error: 'Username/email belum didaftarin. Cek dulu di Supabase Auth → Users.' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Username/email atau password-nya kurang tepat nih' }
  }

  redirect('/dashboard')
}
