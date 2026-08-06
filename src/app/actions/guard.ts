import { getServerSession } from '@/lib/session-server'

export async function requireBendahara(): Promise<{ error: string } | null> {
  const session = await getServerSession()
  if (!session) return { error: 'Anda harus login terlebih dahulu.' }
  if (session.role !== 'bendahara') {
    return { error: 'Aksi ini hanya untuk bendahara.' }
  }
  return null
}

export async function requireSuperadmin(): Promise<{ error: string } | null> {
  const session = await getServerSession()
  if (!session) return { error: 'Anda harus login terlebih dahulu.' }
  if (session.role !== 'superadmin') {
    return { error: 'Aksi ini hanya untuk superadmin.' }
  }
  return null
}
