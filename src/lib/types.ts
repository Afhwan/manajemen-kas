export type CategoryType = 'income' | 'expense'
export type TransactionType = 'income' | 'expense'
export type IuranStatus = 'paid' | 'unpaid'
export type UserRole = 'bendahara' | 'walikelas' | 'superadmin'

export interface AppUser {
  id: string
  username: string
  email: string
  role: UserRole
  created_at: string
}

export interface ClassInfo {
  id: number
  class_name: string
  academic_year: string
  iuran_amount: number
  created_at: string
}

export interface Member {
  id: string
  name: string
  nis: string | null
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  type: CategoryType
  is_active: boolean
}

export interface Transaction {
  id: string
  type: TransactionType
  category_id: string
  amount: number
  description: string
  transaction_date: string
  proof_public_id: string | null
  proof_url: string | null
  iuran_id: string | null
  created_at: string
  categories?: { id: string; name: string; type: CategoryType } | null
}

export interface Iuran {
  id: string
  member_id: string
  period: string
  amount: number
  status: IuranStatus
  paid_at: string | null
  transaction_id: string | null
  created_at: string
  members?: { id: string; name: string } | null
}

export interface SessionUser {
  id: string
  username: string
  email: string
  role: UserRole
}

export interface AppUserRow {
  username: string
  role: UserRole
}
