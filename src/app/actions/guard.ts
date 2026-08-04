import { getServerSession } from '@/lib/session-server'

export async function requireBendahara(): Promise<{ error: string } | null> {
  const session = await getServerSession()
  if (!session || session.role !== 'bendahara') {
    return { error: 'Aksi ini khusus bendahara ya' }
  }
  return null
}
