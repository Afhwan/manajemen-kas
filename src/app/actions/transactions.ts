'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireBendahara } from '@/app/actions/guard'
import { deleteProof } from '@/lib/cloudinary'

export async function addTransaction(formData: FormData) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const type = String(formData.get('type') ?? '')
  const categoryId = String(formData.get('category_id') ?? '')
  const amount = Number(String(formData.get('amount') ?? ''))
  const description = String(formData.get('description') ?? '').trim()
  const transactionDate = String(formData.get('transaction_date') ?? '')
  const proofUrl = String(formData.get('proof_url') ?? '') || null
  const proofPublicId = String(formData.get('proof_public_id') ?? '') || null

  if (type !== 'income' && type !== 'expense') {
    return { error: 'Jenis transaksi tidak valid.' }
  }
  if (!categoryId) return { error: 'Kategori wajib dipilih.' }
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: 'Nominal harus berupa angka yang valid.' }
  }

  const { error } = await supabase.from('transactions').insert({
    type,
    category_id: categoryId,
    amount,
    description,
    transaction_date: transactionDate || undefined,
    proof_url: proofUrl,
    proof_public_id: proofPublicId,
  })
  if (error) return { error: error.message }
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
}

export async function updateTransaction(formData: FormData) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const type = String(formData.get('type') ?? '')
  const categoryId = String(formData.get('category_id') ?? '')
  const amount = Number(String(formData.get('amount') ?? ''))
  const description = String(formData.get('description') ?? '').trim()
  const transactionDate = String(formData.get('transaction_date') ?? '')
  const proofUrl = String(formData.get('proof_url') ?? '') || null
  const proofPublicId = String(formData.get('proof_public_id') ?? '') || null
  const removeProof = String(formData.get('remove_proof') ?? '') === '1'

  if (type !== 'income' && type !== 'expense') {
    return { error: 'Jenis transaksi tidak valid.' }
  }
  if (!categoryId) return { error: 'Kategori wajib dipilih.' }
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: 'Nominal harus berupa angka yang valid.' }
  }

  // Ambil data lama untuk membersihkan bukti lama bila perlu.
  const { data: existing } = await supabase
    .from('transactions')
    .select('proof_public_id')
    .eq('id', id)
    .single()

  const updateData: Record<string, unknown> = {
    type,
    category_id: categoryId,
    amount,
    description,
    transaction_date: transactionDate || undefined,
    proof_url: proofUrl,
    proof_public_id: proofPublicId,
  }

  if (removeProof) {
    updateData.proof_url = null
    updateData.proof_public_id = null
  }

  const { error } = await supabase.from('transactions').update(updateData).eq('id', id)
  if (error) return { error: error.message }

  if (removeProof && existing?.proof_public_id) {
    await deleteProof(existing.proof_public_id)
  }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
}

export async function deleteTransaction(id: string) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('transactions')
    .select('proof_public_id')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return { error: error.message }

  if (existing?.proof_public_id) {
    await deleteProof(existing.proof_public_id)
  }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
}
