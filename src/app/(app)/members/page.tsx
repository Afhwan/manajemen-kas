'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { addMember, setMemberActive, updateMember } from '@/app/actions/members'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { fetchMembers } from '@/lib/queries'
import type { Member } from '@/lib/types'

export default function MembersPage() {
  const { toast } = useToast()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    async function load() {
      const data = await fetchMembers(true)
      if (!ignore) setMembers(data)
    }
    load()
    return () => {
      ignore = true
    }
  }, [refreshKey])

  const filtered = useMemo(() => {
    if (!members) return []
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.nis ?? '').toLowerCase().includes(q)
    )
  }, [members, search])

  function openAdd() {
    setEditing(null)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(m: Member) {
    setEditing(m)
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    const formData = new FormData(e.currentTarget)

    const result = editing ? await updateMember(formData) : await addMember(formData)

    if (result && 'error' in result) {
      setFormError(result.error as string)
      setSaving(false)
      return
    }

    setModalOpen(false)
    setSaving(false)
    toast(editing ? 'Data anggota berhasil diperbarui.' : 'Anggota berhasil ditambahkan.')
    setRefreshKey((k) => k + 1)
  }

  async function handleToggleActive(m: Member) {
    const result = await setMemberActive(m.id, !m.is_active)
    if (result && 'error' in result) {
      toast(result.error as string, 'error')
      return
    }
    toast(m.is_active ? 'Anggota dinonaktifkan.' : 'Anggota diaktifkan kembali.')
    setRefreshKey((k) => k + 1)
  }

  if (!members) return <PageLoader />

  const activeCount = members.filter((m) => m.is_active).length

  return (
    <div>
      <PageHeader
        title="Anggota"
        subtitle={`${activeCount} anggota aktif dari ${members.length} total`}
        action={<Button onClick={openAdd}>Tambah Anggota</Button>}
      />

      <div className="mb-4 max-w-sm">
        <Input
          type="search"
          placeholder="Cari nama atau NIS…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            title={search ? 'Tidak ditemukan' : 'Belum ada anggota'}
            description={
              search
                ? 'Coba gunakan kata kunci lain.'
                : 'Tambahkan anggota pertama agar dapat mencatat iuran.'
            }
            action={!search ? <Button onClick={openAdd}>Tambah Anggota</Button> : undefined}
          />
        ) : (
          <CardContent className="p-0">
            <ul className="divide-y divide-zinc-100 md:hidden">
              {filtered.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{m.name}</p>
                    <p className="text-xs text-zinc-500">{m.nis ?? '—'}</p>
                    <div className="mt-1">
                      {m.is_active ? (
                        <Badge variant="green">Aktif</Badge>
                      ) : (
                        <Badge variant="zinc">Nonaktif</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-stretch gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(m)}>
                      {m.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-5 py-3 font-medium">Nama</th>
                    <th className="px-5 py-3 font-medium">NIS</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-50">
                      <td className="px-5 py-3 font-medium text-ink">{m.name}</td>
                      <td className="px-5 py-3 text-zinc-500">{m.nis ?? '—'}</td>
                      <td className="px-5 py-3">
                        {m.is_active ? (
                          <Badge variant="green">Aktif</Badge>
                        ) : (
                          <Badge variant="zinc">Nonaktif</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(m)}
                          >
                            {m.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Anggota' : 'Tambah Anggota'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <Field label="Nama Lengkap">
            <Input name="name" required defaultValue={editing?.name ?? ''} placeholder="Nama siswa" />
          </Field>
          <Field label="NIS" hint="Boleh dikosongkan">
            <Input name="nis" defaultValue={editing?.nis ?? ''} placeholder="Contoh: 2026001" />
          </Field>
          {formError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
