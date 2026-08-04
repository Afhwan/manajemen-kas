'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const username = String(formData.get('username') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!username || !password) {
    return { error: 'Username sama password wajib diisi dong' }
  }

  const supabase = await createClient()
  const { data: email } = await supabase.rpc('get_email_by_username', {
    p_username: username,
  })

  if (!email) {
    return { error: 'Username atau password-nya kurang tepat nih' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Username atau password-nya kurang tepat nih' }
  }

  redirect('/dashboard')
}
