'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireBendahara } from '@/app/actions/guard'

export async function addMember(formData: FormData) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const name = String(formData.get('name') ?? '').trim()
  const nis = String(formData.get('nis') ?? '').trim() || null

  if (!name) return { error: 'Nama siswa harus diisi dong' }

  const { error } = await supabase.from('members').insert({ name, nis })
  if (error) return { error: error.message }
  revalidatePath('/members')
}

export async function updateMember(formData: FormData) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const nis = String(formData.get('nis') ?? '').trim() || null

  if (!name) return { error: 'Nama siswa harus diisi dong' }

  const { error } = await supabase.from('members').update({ name, nis }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/members')
}

export async function setMemberActive(id: string, isActive: boolean) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const { error } = await supabase
    .from('members')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/members')
}
