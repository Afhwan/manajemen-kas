'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { updateClassInfo, addCategory, deleteCategory, toggleCategoryActive } from '@/app/actions/settings'
import { createClient } from '@/lib/supabase/client'
import { getSessionUser, type SessionUser } from '@/lib/session'
import { initials } from '@/lib/utils'
import { fetchClassInfo, fetchCategories } from '@/lib/queries'
import type { Category, ClassInfo } from '@/lib/types'

export default function SettingsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [info, setInfo] = useState<ClassInfo | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [catAdding, setCatAdding] = useState(false)

  useEffect(() => {
    getSessionUser().then(setUser).catch(() => setUser(null))
  }, [])

  const load = useCallback(async () => {
    const [i, c] = await Promise.all([fetchClassInfo(), fetchCategories()])
    setInfo(i)
    setCategories(c)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleInfoUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const result = await updateClassInfo(new FormData(e.currentTarget))
    if (result && 'error' in result) {
      toast(result.error, 'error')
    } else {
      toast('Pengaturan kelas keupdate')
      load()
    }
    setSaving(false)
  }

  async function handleAddCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCatAdding(true)
    const result = await addCategory(new FormData(e.currentTarget))
    if (result && 'error' in result) {
      toast(result.error, 'error')
    } else {
      toast('Kategori berhasil ditambah')
      load()
    }
    setCatAdding(false)
  }

  async function handleToggle(id: string, active: boolean) {
    const result = await toggleCategoryActive(id, active)
    if (result && 'error' in result) {
      toast(result.error, 'error')
    } else {
      toast(`Kategori ${active ? 'diaktifin' : 'dinonaktifin'}`)
      load()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus kategori ini?')) return
    const result = await deleteCategory(id)
    if (result && 'error' in result) {
      toast(result.error, 'error')
    } else {
      toast('Kategori kehapus')
      load()
    }
  }

  if (loading) return <PageLoader />

  return (
    <div>
      <PageHeader title="Pengaturan" subtitle="Atur kelas, iuran, dan kategori" />

      <form onSubmit={handleInfoUpdate} className="mb-8 space-y-4">
        <Card>
          <CardHeader title="Informasi Kelas" />
          <CardContent className="space-y-4">
            <Field label="Nama Kelas">
              <Input name="class_name" required defaultValue={info?.class_name ?? ''} />
            </Field>
            <Field label="Tahun Ajaran">
              <Input name="academic_year" required defaultValue={info?.academic_year ?? ''} />
            </Field>
            <Field label="Nominal Iuran Bulanan (Rp)">
              <Input name="iuran_amount" type="number" required min={0} defaultValue={info?.iuran_amount ?? 10000} />
            </Field>
            <Button type="submit" disabled={saving}>
              {saving ? 'Nyimpen…' : 'Simpen'}
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader title="Kategori Transaksi" />
        <CardContent className="space-y-4">
          <form onSubmit={handleAddCategory} className="flex gap-3">
            <Field label="Nama" className="flex-1">
              <Input name="name" required placeholder="Contoh: Transport" />
            </Field>
            <Field label="Tipe" className="w-36">
              <Select name="type" defaultValue="expense">
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </Select>
            </Field>
            <Button type="submit" disabled={catAdding} className="self-end">
              {catAdding ? 'Nambahin…' : 'Tambah'}
            </Button>
          </form>

          <ul className="divide-y divide-zinc-100">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-2 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-zinc-800">{c.name}</span>
                  <Badge variant={c.type === 'income' ? 'green' : 'red'}>
                    {c.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(c.id, !c.is_active)}
                  >
                    {c.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Akun" subtitle="Informasi login yang dipakai" />
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {user ? initials(user.username) : '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-800">{user?.username ?? 'Pengguna'}</p>
              <p className="text-xs text-zinc-500">{user?.email}</p>
            </div>
            {user ? <Badge variant="brand">Bendahara</Badge> : null}
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await createClient().auth.signOut()
              router.push('/login')
              router.refresh()
            }}
          >
            Keluar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}