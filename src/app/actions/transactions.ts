'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addTransaction(formData: FormData) {
  const supabase = await createClient()
  const type = String(formData.get('type') ?? 'income')
  const categoryId = String(formData.get('category_id') ?? '') || null
  const amount = parseInt(String(formData.get('amount') ?? '0'), 10)
  const description = String(formData.get('description') ?? '').trim()
  const transactionDate = String(formData.get('transaction_date') ?? '')

  if (!amount || amount < 0) return { error: 'Jumlah tidak valid' }
  if (!description) return { error: 'Keterangan wajib diisi' }

  const payload: {
    type: string
    category_id?: string | null
    amount: number
    description: string
    transaction_date: string
    proof_public_id?: string | null
    proof_url?: string | null
  } = {
    type,
    category_id: categoryId,
    amount,
    description,
    transaction_date: transactionDate || new Date().toISOString().slice(0, 10),
  }

  const { data, error } = await supabase.from('transactions').insert(payload).select().single()
  if (error) return { error: error.message }
  revalidatePath('/transactions')
  return { ok: true, data }
}

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const type = String(formData.get('type') ?? 'income')
  const categoryId = String(formData.get('category_id') ?? '') || null
  const amount = parseInt(String(formData.get('amount') ?? '0'), 10)
  const description = String(formData.get('description') ?? '').trim()
  const transactionDate = String(formData.get('transaction_date') ?? '')

  if (!amount || amount < 0) return { error: 'Jumlah tidak valid' }
  if (!description) return { error: 'Keterangan wajib diisi' }

  const { error } = await supabase
    .from('transactions')
    .update({
      type,
      category_id: categoryId,
      amount,
      description,
      transaction_date: transactionDate || new Date().toISOString().slice(0, 10),
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/transactions')
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()

  const { data: tx } = await supabase.from('transactions').select('iuran_id').eq('id', id).single()

  if (tx?.iuran_id) {
    return { error: 'Transaksi ini terhubung dengan iuran. Batalkan iuran terlebih dahulu.' }
  }

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/transactions')
}

export async function uploadProof(
  id: string,
  file: File
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { compressImage, uploadProofToCloudinary } = await import('@/lib/cloudinary')

  const compressed = await compressImage(file)
  const { publicId, url } = await uploadProofToCloudinary(compressed)

  const { error } = await supabase
    .from('transactions')
    .update({ proof_public_id: publicId, proof_url: url })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/transactions')
}

export async function removeProof(id: string) {
  const supabase = await createClient()
  const { data: tx } = await supabase
    .from('transactions')
    .select('proof_public_id')
    .eq('id', id)
    .single()

  if (tx?.proof_public_id) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    if (cloudName) {
      await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy/${tx.proof_public_id}`,
        { method: 'POST' }
      ).catch(() => {})
    }
  }

  const { error } = await supabase
    .from('transactions')
    .update({ proof_public_id: null, proof_url: null })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/transactions')
}