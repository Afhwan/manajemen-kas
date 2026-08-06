'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  createUser,
  deleteUser,
  listAppUsers,
  resetUserPassword,
  updateUserRole,
} from '@/app/actions/users'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import type { UserRole } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface UserRow {
  id: string
  username: string
  email: string
  role: UserRole
  created_at: string
}

const roleLabels: Record<UserRole, string> = {
  bendahara: 'Bendahara',
  walikelas: 'Wali Kelas',
  superadmin: 'Superadmin',
}

export default function UsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let ignore = false
    async function load() {
      const result = await listAppUsers()
      if (ignore) return
      if (result && 'error' in result) {
        setError(result.error as string)
        setUsers([])
        return
      }
      if (result && 'users' in result) {
        setUsers(result.users as UserRow[])
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [refreshKey])

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    const formData = new FormData(e.currentTarget)
    const result = await createUser(formData)
    if (result && 'error' in result) {
      setFormError(result.error as string)
      setSaving(false)
      return
    }
    setSaving(false)
    setAddOpen(false)
    toast('Akun berhasil dibuat.')
    setRefreshKey((k) => k + 1)
  }

  async function handleRoleChange(u: UserRow, role: string) {
    if (role === u.role) return
    const result = await updateUserRole(u.id, role)
    if (result && 'error' in result) {
      toast(result.error as string, 'error')
      return
    }
    toast(`Role ${u.username} diubah menjadi ${roleLabels[role as UserRole]}.`)
    setRefreshKey((k) => k + 1)
  }

  async function handleResetPassword() {
    if (!resetTarget) return
    if (resetPassword.length < 6) {
      toast('Password minimal 6 karakter.', 'error')
      return
    }
    setBusy(true)
    const result = await resetUserPassword(resetTarget.id, resetPassword)
    if (result && 'error' in result) {
      setBusy(false)
      toast(result.error as string, 'error')
      return
    }
    setBusy(false)
    setResetTarget(null)
    setResetPassword('')
    toast(`Password ${resetTarget.username} berhasil direset.`)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setBusy(true)
    const result = await deleteUser(deleteTarget.id)
    if (result && 'error' in result) {
      setBusy(false)
      toast(result.error as string, 'error')
      return
    }
    setBusy(false)
    setDeleteTarget(null)
    toast(`Akun ${deleteTarget.username} dihapus.`)
    setRefreshKey((k) => k + 1)
  }

  if (users === null && !error) return <PageLoader />

  if (error) {
    return (
      <div>
        <PageHeader title="Kelola Pengguna" />
        <Card>
          <CardContent>
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Kelola Pengguna"
        subtitle="Buat, ubah peran, reset password, dan hapus akun"
        action={<Button onClick={() => setAddOpen(true)}>Tambah Akun</Button>}
      />

      <Card>
        <CardContent className="p-0">
          {users!.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">Belum ada pengguna.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {users!.map((u) => (
                <li key={u.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{u.username}</p>
                      <p className="text-xs text-zinc-500">{u.email}</p>
                      <p className="text-xs text-zinc-400">Dibuat {formatDate(u.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={u.role === 'superadmin' ? 'maroon' : u.role === 'walikelas' ? 'gold' : 'green'}
                      >
                        {roleLabels[u.role]}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      className="w-auto"
                    >
                      <option value="bendahara">Bendahara</option>
                      <option value="walikelas">Wali Kelas</option>
                      <option value="superadmin">Superadmin</option>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => setResetTarget(u)}>
                      Reset Password
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-700"
                      onClick={() => setDeleteTarget(u)}
                    >
                      Hapus
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Akun">
        <form onSubmit={handleAdd} className="space-y-4">
          <Field label="Username" hint="Huruf kecil, tanpa spasi. Contoh: qeida">
            <Input name="username" required placeholder="username" />
          </Field>
          <Field label="Password">
            <Input type="password" name="password" required placeholder="Minimal 6 karakter" />
          </Field>
          <Field label="Peran">
            <Select name="role" defaultValue="bendahara">
              <option value="bendahara">Bendahara</option>
              <option value="walikelas">Wali Kelas</option>
              <option value="superadmin">Superadmin</option>
            </Select>
          </Field>
          {formError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Membuat…' : 'Buat Akun'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={resetTarget !== null}
        onClose={() => {
          setResetTarget(null)
          setResetPassword('')
        }}
        title={`Reset Password: ${resetTarget?.username ?? ''}`}
      >
        <div className="space-y-4">
          <Field label="Password Baru" hint="Minimal 6 karakter">
            <Input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Password baru"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResetTarget(null)
                setResetPassword('')
              }}
            >
              Batal
            </Button>
            <Button type="button" onClick={handleResetPassword} disabled={busy}>
              {busy ? 'Memproses…' : 'Reset'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Hapus akun ${deleteTarget?.username ?? ''}?`}
        description="Akun tidak dapat dikembalikan setelah dihapus."
        confirmLabel="Hapus"
        busy={busy}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
