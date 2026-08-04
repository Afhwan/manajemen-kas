'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireBendahara } from '@/app/actions/guard'

export async function markIuranPaid(
  memberId: string,
  period: string,
  amount: number,
  transactionId?: string | null
) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('iurans')
    .select('id')
    .eq('member_id', memberId)
    .eq('period', period)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('iurans')
      .update({ status: 'paid', paid_at: new Date().toISOString(), transaction_id: transactionId ?? null })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('iurans').insert({
      member_id: memberId,
      period,
      amount,
      status: 'paid',
      paid_at: new Date().toISOString(),
      transaction_id: transactionId ?? null,
    })
    if (error) return { error: error.message }
  }
  revalidatePath('/iuran')
}

export async function markIuranUnpaid(memberId: string, period: string) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('iurans')
    .select('id, transaction_id')
    .eq('member_id', memberId)
    .eq('period', period)
    .single()

  if (!existing) return { error: 'Data iurannya gak ditemukan' }

  if (existing.transaction_id) {
    const { error: txErr } = await supabase
      .from('transactions')
      .delete()
      .eq('id', existing.transaction_id)
    if (txErr) return { error: txErr.message }
  }

  const { error } = await supabase
    .from('iurans')
    .update({ status: 'unpaid', paid_at: null, transaction_id: null })
    .eq('id', existing.id)

  if (error) return { error: error.message }
  revalidatePath('/iuran')
}

export async function batchMarkPaid(
  memberIds: string[],
  period: string,
  amount: number
) {
  const guard = await requireBendahara()
  if (guard) return guard

  const results = await Promise.all(
    memberIds.map((id) =>
      markIuranPaid(id, period, amount).catch((e) => ({ error: e.message }))
    )
  )
  const errors = results.filter((r) => r && 'error' in r)
  if (errors.length > 0) {
    return { error: `${errors.length} dari ${memberIds.length} gagal ditandai, coba lagi` }
  }
  revalidatePath('/iuran')
}
