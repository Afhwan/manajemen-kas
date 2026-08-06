'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { addTransaction, deleteTransaction, updateTransaction } from '@/app/actions/transactions'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { uploadProof } from '@/lib/cloudinary'
import { fetchCategories, fetchTransactions } from '@/lib/queries'
import type { Category, Transaction } from '@/lib/types'
import { currentDateISO, formatDate, formatRupiah } from '@/lib/utils'

export default function TransactionsPage() {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    async function load() {
      const [tx, cats] = await Promise.all([fetchTransactions(), fetchCategories()])
      if (ignore) return
      setTransactions(tx)
      setCategories(cats)
    }
    load()
    return () => {
      ignore = true
    }
  }, [refreshKey])

  const filtered = useMemo(() => {
    if (!transactions) return []
    if (filterType === 'all') return transactions
    return transactions.filter((t) => t.type === filterType)
  }, [transactions, filterType])

  const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense

  function openAdd() {
    setEditing(null)
    setFormError(null)
    setProofFile(null)
    setProofPreview(null)
    setModalOpen(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    setFormError(null)
    setProofFile(null)
    setProofPreview(t.proof_url)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving || uploading) return
    setModalOpen(false)
  }

  async function handleProofChange(file: File | null) {
    if (!file) {
      setProofFile(null)
      setProofPreview(null)
      return
    }
    setProofFile(file)
    setProofPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

    const formData = new FormData(e.currentTarget)

    if (proofFile) {
      try {
        setUploading(true)
        const result = await uploadProof(proofFile)
        formData.set('proof_url', result.url)
        formData.set('proof_public_id', result.publicId)
      } catch (err) {
        setUploading(false)
        setSaving(false)
        setFormError(err instanceof Error ? err.message : 'Gagal mengunggah bukti.')
        return
      }
    } else if (proofPreview === null && editing) {
      formData.set('remove_proof', '1')
    }

    const result = editing ? await updateTransaction(formData) : await addTransaction(formData)

    if (result && 'error' in result) {
      setUploading(false)
      setSaving(false)
      setFormError(result.error as string)
      return
    }

    setUploading(false)
    setSaving(false)
    setModalOpen(false)
    toast(editing ? 'Transaksi berhasil diperbarui.' : 'Transaksi berhasil dicatat.')
    setRefreshKey((k) => k + 1)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteTransaction(deleteTarget.id)
    if (result && 'error' in result) {
      setDeleting(false)
      toast(result.error as string, 'error')
      return
    }
    setDeleting(false)
    setDeleteTarget(null)
    toast('Transaksi dihapus.')
    setRefreshKey((k) => k + 1)
  }

  if (!transactions) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Transaksi"
        subtitle="Catatan pemasukan dan pengeluaran kas"
        action={<Button onClick={openAdd}>Catat Transaksi</Button>}
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <SummaryBox label="Pemasukan" value={formatRupiah(income)} className="text-green-600" />
        <SummaryBox label="Pengeluaran" value={formatRupiah(expense)} className="text-maroon-700" />
        <SummaryBox label="Selisih" value={formatRupiah(balance)} className="text-ink" />
      </div>

      <div className="mb-4 flex max-w-sm gap-2">
        {(
          [
            ['all', 'Semua'],
            ['income', 'Pemasukan'],
            ['expense', 'Pengeluaran'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilterType(value)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              filterType === value
                ? 'border-maroon-600 bg-maroon-600 text-paper'
                : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi"
            description="Catat pemasukan atau pengeluaran untuk mulai mengelola kas kelas."
            action={<Button onClick={openAdd}>Catat Transaksi</Button>}
          />
        ) : (
          <CardContent className="p-0">
            <ul className="divide-y divide-zinc-100 md:hidden">
              {filtered.map((t) => (
                <li key={t.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {t.description || t.categories?.name || 'Transaksi'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(t.transaction_date)} · {t.categories?.name}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        t.type === 'income' ? 'text-green-600' : 'text-maroon-700'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {formatRupiah(t.amount)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={t.type === 'income' ? 'green' : 'maroon'}>
                      {t.type === 'income' ? 'Masuk' : 'Keluar'}
                    </Badge>
                    {t.proof_url ? (
                      <a
                        href={t.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-maroon-700 underline"
                      >
                        Lihat bukti
                      </a>
                    ) : null}
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(t)}>
                        Hapus
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-5 py-3 font-medium">Tanggal</th>
                    <th className="px-5 py-3 font-medium">Keterangan</th>
                    <th className="px-5 py-3 font-medium">Kategori</th>
                    <th className="px-5 py-3 font-medium">Jenis</th>
                    <th className="px-5 py-3 text-right font-medium">Nominal</th>
                    <th className="px-5 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50">
                      <td className="px-5 py-3 text-zinc-500">{formatDate(t.transaction_date)}</td>
                      <td className="px-5 py-3">
                        <span className="font-medium text-ink">{t.description || '—'}</span>
                        {t.proof_url ? (
                          <a
                            href={t.proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-2 text-xs text-maroon-700 underline"
                          >
                            bukti
                          </a>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">{t.categories?.name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <Badge variant={t.type === 'income' ? 'green' : 'maroon'}>
                          {t.type === 'income' ? 'Masuk' : 'Keluar'}
                        </Badge>
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-semibold ${
                          t.type === 'income' ? 'text-green-600' : 'text-maroon-700'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '-'}
                        {formatRupiah(t.amount)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
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

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Transaksi' : 'Catat Transaksi'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Jenis">
              <Select name="type" required defaultValue={editing?.type ?? 'income'}>
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </Select>
            </Field>
            <Field label="Tanggal">
              <Input
                type="date"
                name="transaction_date"
                defaultValue={editing?.transaction_date ?? currentDateISO()}
              />
            </Field>
          </div>

          <Field label="Kategori">
            <Select name="category_id" required defaultValue={editing?.category_id ?? ''}>
              <option value="" disabled>
                Pilih kategori
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'income' ? 'Masuk' : 'Keluar'})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Nominal (Rp)">
            <Input
              type="number"
              name="amount"
              min={0}
              required
              defaultValue={editing?.amount ?? ''}
              placeholder="10000"
            />
          </Field>

          <Field label="Keterangan" hint="Contoh: Iuran bulan Mei, beli spidol">
            <Textarea
              name="description"
              defaultValue={editing?.description ?? ''}
              placeholder="Keterangan transaksi"
            />
          </Field>

          <Field label="Bukti Pembayaran" hint="Opsional. Foto akan dikompresi sebelum diunggah.">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleProofChange(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-maroon-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-maroon-700 hover:file:bg-maroon-100"
            />
          </Field>

          {proofPreview ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofPreview}
                alt="Pratinjau bukti"
                className="max-h-40 rounded-lg border border-zinc-200 object-contain"
              />
              <button
                type="button"
                onClick={() => handleProofChange(null)}
                className="mt-1 text-xs text-maroon-700 hover:underline"
              >
                Hapus bukti
              </button>
            </div>
          ) : null}

          {formError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {uploading ? 'Mengunggah…' : saving ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus transaksi?"
        description="Transaksi yang dihapus tidak dapat dikembalikan."
        confirmLabel="Hapus"
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function SummaryBox({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className: string
}) {
  return (
    <Card>
      <CardContent className="px-3 py-3">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className={`mt-0.5 truncate text-sm font-semibold md:text-base ${className}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
