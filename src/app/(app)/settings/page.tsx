'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { addCategory, toggleCategoryActive, updateClassInfo } from '@/app/actions/settings'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { fetchCategories, fetchClassInfo } from '@/lib/queries'
import type { Category, ClassInfo } from '@/lib/types'

export default function SettingsPage() {
  const { toast } = useToast()
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [catName, setCatName] = useState('')
  const [catType, setCatType] = useState<'income' | 'expense'>('income')

  useEffect(() => {
    let ignore = false
    async function load() {
      const [info, cats] = await Promise.all([fetchClassInfo(), fetchCategories()])
      if (ignore) return
      setClassInfo(info)
      setCategories(cats)
    }
    load()
    return () => {
      ignore = true
    }
  }, [refreshKey])

  async function handleClassInfo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    const formData = new FormData(e.currentTarget)
    const result = await updateClassInfo(formData)
    if (result && 'error' in result) {
      setFormError(result.error as string)
      setSaving(false)
      return
    }
    setSaving(false)
    toast('Pengaturan kelas berhasil disimpan.')
    setRefreshKey((k) => k + 1)
  }

  async function handleAddCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('name', catName)
    formData.set('type', catType)
    const result = await addCategory(formData)
    if (result && 'error' in result) {
      toast(result.error as string, 'error')
      return
    }
    setCatName('')
    toast('Kategori berhasil ditambahkan.')
    setRefreshKey((k) => k + 1)
  }

  async function handleToggleCategory(c: Category) {
    const result = await toggleCategoryActive(c.id, !c.is_active)
    if (result && 'error' in result) {
      toast(result.error as string, 'error')
      return
    }
    toast(c.is_active ? 'Kategori dinonaktifkan.' : 'Kategori diaktifkan.')
    setRefreshKey((k) => k + 1)
  }

  if (!classInfo) return <PageLoader />

  const incomeCats = categories.filter((c) => c.type === 'income')
  const expenseCats = categories.filter((c) => c.type === 'expense')

  return (
    <div>
      <PageHeader title="Pengaturan" subtitle="Kelola informasi kelas dan kategori" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Informasi Kelas" />
          <CardContent>
            <form onSubmit={handleClassInfo} className="space-y-4">
              <Field label="Nama Kelas">
                <Input
                  name="class_name"
                  required
                  defaultValue={classInfo.class_name}
                  placeholder="Contoh: X RPL 1"
                />
              </Field>
              <Field label="Tahun Ajaran">
                <Input
                  name="academic_year"
                  required
                  defaultValue={classInfo.academic_year}
                  placeholder="Contoh: 2026/2027"
                />
              </Field>
              <Field label="Nominal Iuran (Rp)" hint="Iuran per siswa setiap bulan">
                <Input
                  type="number"
                  name="iuran_amount"
                  min={0}
                  required
                  defaultValue={classInfo.iuran_amount}
                />
              </Field>
              {formError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {formError}
                </p>
              ) : null}
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Menyimpan…' : 'Simpan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Kategori Transaksi" />
          <CardContent>
            <form onSubmit={handleAddCategory} className="mb-4 flex gap-2">
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Nama kategori baru"
                className="flex-1"
              />
              <Select value={catType} onChange={(e) => setCatType(e.target.value as 'income' | 'expense')}>
                <option value="income">Masuk</option>
                <option value="expense">Keluar</option>
              </Select>
              <Button type="submit" disabled={!catName.trim()}>
                Tambah
              </Button>
            </form>

            <CategoryGroup title="Pemasukan" cats={incomeCats} onToggle={handleToggleCategory} />
            <CategoryGroup title="Pengeluaran" cats={expenseCats} onToggle={handleToggleCategory} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CategoryGroup({
  title,
  cats,
  onToggle,
}: {
  title: string
  cats: Category[]
  onToggle: (c: Category) => void
}) {
  if (cats.length === 0) {
    return (
      <div className="mb-4">
        <p className="mb-1 text-sm font-medium text-zinc-700">{title}</p>
        <EmptyState title="Belum ada kategori" />
      </div>
    )
  }
  return (
    <div className="mb-4">
      <p className="mb-1 text-sm font-medium text-zinc-700">{title}</p>
      <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
        {cats.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-3 py-2.5">
            <span className={`text-sm ${c.is_active ? 'text-ink' : 'text-zinc-400'}`}>{c.name}</span>
            <div className="flex items-center gap-2">
              {c.is_active ? <Badge variant="green">Aktif</Badge> : <Badge variant="zinc">Nonaktif</Badge>}
              <Button variant="ghost" size="sm" onClick={() => onToggle(c)}>
                {c.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
