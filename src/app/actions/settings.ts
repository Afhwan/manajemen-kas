'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateClassInfo(formData: FormData) {
  const supabase = await createClient()
  const class_name = String(formData.get('class_name') ?? '').trim()
  const academic_year = String(formData.get('academic_year') ?? '').trim()
  const iuran_amount = parseInt(String(formData.get('iuran_amount') ?? '0'), 10)

  if (!class_name) return { error: 'Nama kelas wajib diisi dong' }
  if (!academic_year) return { error: 'Tahun ajaran wajib diisi' }
  if (!iuran_amount || iuran_amount < 0) return { error: 'Nominal iuran belum valid nih' }

  const { error } = await supabase
    .from('class_info')
    .update({ class_name, academic_year, iuran_amount })
    .eq('id', 1)

  if (error) return { error: error.message }
  revalidatePath('/settings')
}

export async function addCategory(formData: FormData) {
  const supabase = await createClient()
  const name = String(formData.get('name') ?? '').trim()
  const type = String(formData.get('type') ?? 'income')

  if (!name) return { error: 'Nama kategori harus diisi dulu' }
  if (!['income', 'expense'].includes(type)) return { error: 'Tipe kategori gak valid' }

  const { error } = await supabase.from('categories').insert({ name, type })
  if (error) return { error: error.message }
  revalidatePath('/settings')
}

export async function toggleCategoryActive(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings')
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings')
}