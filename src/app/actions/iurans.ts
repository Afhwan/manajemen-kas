'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireBendahara } from '@/app/actions/guard'

export async function generateIuranPeriod(period: string) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const { data: members } = await supabase
    .from('members')
    .select('id')
    .eq('is_active', true)
  const { data: classInfo } = await supabase.from('class_info').select('iuran_amount').single()

  if (!members?.length) return { error: 'Belum ada anggota aktif.' }

  const rows = members.map((m) => ({
    member_id: m.id,
    period,
    amount: classInfo?.iuran_amount ?? 0,
    status: 'unpaid' as const,
  }))

  const { error } = await supabase.from('iurans').upsert(rows, { onConflict: 'member_id,period' })
  if (error) return { error: error.message }
  revalidatePath('/iuran')
  revalidatePath('/dashboard')
}

export async function markIuranPaid(iuranId: string, paid: boolean) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const { data: iuran } = await supabase
    .from('iurans')
    .select('*, members(id, name)')
    .eq('id', iuranId)
    .single()

  if (!iuran) return { error: 'Data iuran tidak ditemukan.' }

  const memberName = (iuran.members as { name?: string }[] | null)?.[0]?.name ?? ''

  if (paid) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'Iuran')
      .eq('type', 'income')
      .maybeSingle()

    const categoryId = cat?.id ?? null
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .insert({
        type: 'income',
        category_id: categoryId,
        amount: iuran.amount,
        description: `Iuran ${memberName} — ${iuran.period}`,
        transaction_date: new Date().toISOString().slice(0, 10),
      })
      .select('id')
      .single()

    if (txnError) return { error: txnError.message }

    const { error } = await supabase
      .from('iurans')
      .update({ status: 'paid', paid_at: new Date().toISOString(), transaction_id: txn?.id })
      .eq('id', iuranId)
    if (error) return { error: error.message }
  } else {
    const txnId = iuran.transaction_id
    if (txnId) {
      await supabase.from('transactions').delete().eq('id', txnId)
    }
    const { error } = await supabase
      .from('iurans')
      .update({ status: 'unpaid', paid_at: null, transaction_id: null })
      .eq('id', iuranId)
    if (error) return { error: error.message }
  }

  revalidatePath('/iuran')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
}

export async function markAllIuranPaid(period: string) {
  const guard = await requireBendahara()
  if (guard) return guard

  const supabase = await createClient()
  const { data: unpaid } = await supabase
    .from('iurans')
    .select('id, amount, members(id, name)')
    .eq('period', period)
    .eq('status', 'unpaid')

  if (!unpaid?.length) return { error: 'Semua iuran sudah lunas.' }

  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'Iuran')
    .eq('type', 'income')
    .maybeSingle()
  const categoryId = cat?.id ?? null
  const today = new Date().toISOString().slice(0, 10)

  for (const i of unpaid as { id: string; amount: number; members?: { name?: string }[] | null }[]) {
    const memberName = i.members?.[0]?.name ?? ''
    const { data: txn } = await supabase
      .from('transactions')
      .insert({
        type: 'income',
        category_id: categoryId,
        amount: i.amount,
        description: `Iuran ${memberName} — ${period}`,
        transaction_date: today,
      })
      .select('id')
      .single()

    await supabase
      .from('iurans')
      .update({ status: 'paid', paid_at: new Date().toISOString(), transaction_id: txn?.id })
      .eq('id', i.id)
  }

  revalidatePath('/iuran')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
}
