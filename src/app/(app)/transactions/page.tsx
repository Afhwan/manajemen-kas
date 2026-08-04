'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { addTransaction, deleteTransaction, uploadProof, removeProof, updateTransaction } from '@/app/actions/transactions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { fetchCategories, fetchTransactions } from '@/lib/queries'
import { formatIDR, formatDate } from '@/lib/utils'
import type { Category, Transaction } from '@/lib/types'

type TxType = 'income' | 'expense'

export default function TransactionsPage() {
  const { toast } = useToast()
  const [txs, setTxs] = useState<Transaction[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [filterType, setFilterType] = useState<TxType | 'all'>('all')
  const [filterMonth, setFilterMonth] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)

  const load = useCallback(async () => {
    const [txData, catData] = await Promise.all([
      fetchTransactions({ limit: 500 }),
      fetchCategories(),
    ])
    setTxs(txData)
    setCategories(catData)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!txs) return []
    return txs.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false
      if (filterMonth && !t.transaction_date.startsWith(filterMonth)) return false
      return true
    })
  }, [txs, filterType, filterMonth])

  const incomeCats = categories.filter((c) => c.type === 'income')
  const expenseCats = categories.filter((c) => c.type === 'expense')
  const usedCats = editing?.type === 'income' ? incomeCats : expenseCats

  function openAdd(type: TxType = 'income') {
    setEditing(null)
    setFormError(null)
    setProofFile(null)
    setModalOpen(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    setFormError(null)
    setProofFile(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    const formData = new FormData(e.currentTarget)

    const result = editing
      ? await updateTransaction(formData)
      : await addTransaction(formData)

    if (result && 'error' in result) {
      setFormError(result.error as string)
      setSaving(false)
      return
    }

    if (proofFile) {
      setUploadingProof(true)
      const txResult = editing
        ? await updateTransaction(new FormData(e.currentTarget))
        : await addTransaction(new FormData(e.currentTarget))
      // Re-fetch to get the new transaction id for proof upload
      await load()
      const latest = txs?.[0]
      if (latest) {
        await uploadProof(latest.id, proofFile).catch(() => {})
      }
      setUploadingProof(false)
    }

    setModalOpen(false)
    setSaving(false)
    setProofFile(null)
    toast(editing ? 'Transaksi diperbarui' : 'Transaksi ditambahkan')
    load()
  }

  async function handleDelete(t: Transaction) {
    const result = await deleteTransaction(t.id)
    if (result && 'error' in result) {
      toast(result.error, 'error')
      return
    }
    toast('Transaksi dihapus')
    load()
  }

  async function handleUploadProof(t: Transaction) {
    if (!proofFile) return
    setUploadingProof(true)
    try {
      await uploadProof(t.id, proofFile)
      toast('Bukti pembayaran diunggah')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gagal mengunggah bukti', 'error')
    }
    setUploadingProof(false)
    load()
  }

  return (
    <div>
      <PageHeader
        title="Transaksi"
        subtitle="Catat pemasukan dan pengeluaran kas kelas"
      >
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => openAdd('income')}>
            + Pemasukan
          </Button>
          <Button variant="outline" size="sm" onClick={() => openAdd('expense')}>
            + Pengeluaran
          </Button>
        </div>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as TxType | 'all')}
        >
          <option value="all">Semua Jenis</option>
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
        </select>
        <input
          type="month"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          title="Filter bulan"
        />
        {filterType !== 'all' || filterMonth ? (
          <Button variant="ghost" size="sm" onClick={() => { setFilterType('all'); setFilterMonth('') }}>
            Reset
          </Button>
        ) : null}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi"
            description="Tambahkan pemasukan atau pengeluaran pertama."
            action={
              <Button size="sm" onClick={() => openAdd('income')}>
                Tambah Transaksi
              </Button>
            }
          />
        ) : (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-4 py-3 font-medium">Tanggal</th>
                    <th className="px-4 py-3 font-medium">Keterangan</th>
                    <th className="px-4 py-3 font-medium">Kategori</th>
                    <th className="px-4 py-3 font-medium">Jenis</th>
                    <th className="px-4 py-3 font-medium">Bukti</th>
                    <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                        {formatDate(t.transaction_date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-800">
                        {t.description}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {t.categories?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {t.type === 'income' ? (
                          <Badge variant="green">Pemasukan</Badge>
                        ) : (
                          <Badge variant="red">Pengeluaran</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {t.proof_url ? (
                          <a
                            href={t.proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-emerald-600 hover:underline"
                          >
                            Lihat
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-300">—</span>
                        )}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                          t.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '−'} {formatIDR(t.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(t)}>
                            Hapus
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget)
          setDeleteTarget(null)
        }}
        title="Hapus Transaksi"
        message="Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Transaksi' : 'Tambah Transaksi'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <Field label="Jenis">
            <Select
              name="type"
              value={editing?.type ?? 'income'}
              onChange={(e) => {
                const val = e.target.value as TxType
                setEditing((prev) => (prev ? { ...prev, type: val } : null))
                setFormError(null)
              }}
            >
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </Select>
          </Field>

          <Field label="Kategori">
            <Select name="category_id" defaultValue={editing?.category_id ?? ''}>
              <option value="">— Pilih kategori —</option>
              {usedCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Jumlah (Rp)" hint="Gunakan angka tanpa titik/rupiah">
            <Input
              type="number"
              name="amount"
              required
              min={1}
              defaultValue={editing?.amount ?? ''}
              placeholder="Contoh: 100000"
            />
          </Field>

          <Field label="Tanggal">
            <Input
              type="date"
              name="transaction_date"
              defaultValue={editing?.transaction_date ?? new Date().toISOString().slice(0, 10)}
            />
          </Field>

          <Field label="Keterangan">
            <Textarea
              name="description"
              required
              defaultValue={editing?.description ?? ''}
              placeholder="Keterangan transaksi"
            />
          </Field>

          <Field label="Bukti Pembayaran (opsional)" hint="Foto transfer atau struk">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setProofFile(e.target.files?.[0] || null)
              }}
            />
          </Field>

          {editing?.proof_url ? (
            <div className="flex items-center gap-3">
              <a
                href={editing.proof_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-emerald-600 hover:underline"
              >
                Bukti saat ini (lihat)
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await removeProof(editing.id)
                  toast('Bukti dihapus')
                  load()
                }}
              >
                Hapus bukti
              </Button>
            </div>
          ) : null}

          {formError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving || uploadingProof}>
              {saving || uploadingProof ? <Spinner className="border-white/40 border-t-white" /> : null}
              {saving ? 'Menyimpan…' : uploadingProof ? 'Mengunggah bukti…' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}