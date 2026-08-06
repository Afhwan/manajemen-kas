'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireBendahara } from '@/app/actions/guard'

export async function updateClassInfo(formData: FormData) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const className = String(formData.get('class_name') ?? '').trim()
  const academicYear = String(formData.get('academic_year') ?? '').trim()
  const iuranAmount = Number(String(formData.get('iuran_amount') ?? ''))

  if (!className) return { error: 'Nama kelas wajib diisi.' }
  if (!academicYear) return { error: 'Tahun ajaran wajib diisi.' }
  if (!Number.isFinite(iuranAmount) || iuranAmount < 0) {
    return { error: 'Nominal iuran harus berupa angka yang valid.' }
  }

  const { error } = await supabase
    .from('class_info')
    .update({ class_name: className, academic_year: academicYear, iuran_amount: iuranAmount })
    .eq('id', 1)
  if (error) return { error: error.message }
  revalidatePath('/settings')
  revalidatePath('/dashboard')
}

export async function addCategory(formData: FormData) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const name = String(formData.get('name') ?? '').trim()
  const type = String(formData.get('type') ?? '')

  if (!name) return { error: 'Nama kategori wajib diisi.' }
  if (type !== 'income' && type !== 'expense') {
    return { error: 'Jenis kategori tidak valid.' }
  }

  const { error } = await supabase.from('categories').insert({ name, type })
  if (error) return { error: error.message }
  revalidatePath('/settings')
}

export async function toggleCategoryActive(id: string, isActive: boolean) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings')
}
