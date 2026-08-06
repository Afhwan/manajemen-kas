'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const identifier = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!identifier || !password) {
    return { error: 'Username dan password wajib diisi.' }
  }

  const supabase = await createClient()

  let email = ''
  if (identifier.includes('@')) {
    email = identifier.toLowerCase()
  } else {
    const { data, error } = await supabase.rpc('get_email_by_username', {
      p_username: identifier.toLowerCase(),
    })
    if (error) {
      return { error: 'Terjadi kesalahan pada server. Silakan coba lagi.' }
    }
    email = (data as string | null) ?? ''
  }

  if (!email) {
    return { error: 'Username tidak terdaftar.' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Username atau password salah.' }
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
