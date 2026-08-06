import { createClient } from '@/lib/supabase/client'
import type { Category, ClassInfo, Iuran, Member, Transaction } from '@/lib/types'

export async function fetchClassInfo() {
  const supabase = createClient()
  const { data } = await supabase.from('class_info').select('*').single()
  return (data as ClassInfo | null) ?? null
}

export async function fetchMembers(includeInactive = true) {
  const supabase = createClient()
  let query = supabase.from('members').select('*').order('name', { ascending: true })
  if (!includeInactive) query = query.eq('is_active', true)
  const { data } = await query
  return (data as Member[]) ?? []
}

export async function fetchCategories() {
  const supabase = createClient()
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })
  return (data as Category[]) ?? []
}

export async function fetchTransactions(opts?: {
  from?: string
  to?: string
  type?: 'income' | 'expense'
  categoryId?: string
  limit?: number
}) {
  const supabase = createClient()
  let query = supabase
    .from('transactions')
    .select('*, categories(id, name, type)')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (opts?.from) query = query.gte('transaction_date', opts.from)
  if (opts?.to) query = query.lte('transaction_date', opts.to)
  if (opts?.type) query = query.eq('type', opts.type)
  if (opts?.categoryId) query = query.eq('category_id', opts.categoryId)
  if (opts?.limit) query = query.limit(opts.limit)

  const { data } = await query
  return (data as Transaction[]) ?? []
}

export async function fetchIurans(period?: string) {
  const supabase = createClient()
  let query = supabase
    .from('iurans')
    .select('*, members(id, name)')
    .order('members(name)', { ascending: true })

  if (period) query = query.eq('period', period)

  const { data } = await query
  return (data as Iuran[]) ?? []
}
