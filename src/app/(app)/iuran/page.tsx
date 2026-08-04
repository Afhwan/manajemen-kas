'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { batchMarkPaid, markIuranPaid, markIuranUnpaid } from '@/app/actions/iurans'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { fetchClassInfo, fetchIurans, fetchMembers } from '@/lib/queries'
import { formatIDR, formatMonthLabel, periodFromDate } from '@/lib/utils'
import type { Iuran, Member } from '@/lib/types'

export default function IuranPage() {
  const { toast } = useToast()
  const [classInfo, setClassInfo] = useState<{ iuran_amount: number } | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [iurans, setIurans] = useState<Iuran[]>([])
  const [period, setPeriod] = useState(periodFromDate(new Date()))
  const [saving, setSaving] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchSaving, setBatchSaving] = useState(false)

  const load = useCallback(async () => {
    const [info, m, i] = await Promise.all([
      fetchClassInfo(),
      fetchMembers(false),
      fetchIurans(period),
    ])
    setClassInfo(info)
    setMembers(m)
    setIurans(i)
  }, [period])

  useEffect(() => {
    load()
  }, [load])

  const paidCount = iurans.filter((i) => i.status === 'paid').length
  const totalAmount = classInfo?.iuran_amount ?? 0
  const collected = paidCount * totalAmount

  const memberMap = useMemo(() => {
    const m = new Map(members.map((mb) => [mb.id, mb]))
    return m
  }, [members])

  function isPaid(memberId: string) {
    return iurans.some((i) => i.member_id === memberId && i.status === 'paid')
  }

  async function togglePaid(memberId: string) {
    const paid = isPaid(memberId)
    if (paid) {
      const result = await markIuranUnpaid(memberId, period)
      if (result && 'error' in result) {
        toast(result.error, 'error')
        return
      }
      toast('Iuran ditandai belum bayar')
    } else {
      const result = await markIuranPaid(memberId, period, totalAmount)
      if (result && 'error' in result) {
        toast(result.error, 'error')
        return
      }
      toast('Iuran ditandai lunas')
    }
    load()
  }

  async function handleBatchMark(e: FormEvent) {
    e.preventDefault()
    if (selectedIds.size === 0) return
    setBatchSaving(true)
    const result = await batchMarkPaid(
      Array.from(selectedIds),
      period,
      totalAmount
    )
    if (result && 'error' in result) {
      toast(result.error, 'error')
    } else {
      toast(`${selectedIds.size} siswa ditandai lunas`)
    }
    setBatchSaving(false)
    setBatchMode(false)
    setSelectedIds(new Set())
    load()
  }

  return (
    <div>
      <PageHeader
        title="Iuran Bulanan"
        subtitle={formatMonthLabel(period)}
      >
        <Input
          type="month"
          value={period.slice(0, 7)}
          onChange={(e) => setPeriod(periodFromDate(new Date(e.target.value + '-01')))}
          className="w-40"
        />
      </PageHeader>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Iuran/Bulan</p>
          <p className="mt-1 text-xl font-bold text-zinc-900">{formatIDR(totalAmount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Sudah Bayar</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{paidCount} / {members.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Terkumpul</p>
          <p className="mt-1 text-xl font-bold text-zinc-900">{formatIDR(collected)}</p>
        </Card>
      </div>

      <Card>
        {members.length === 0 ? (
          <CardContent>
            <p className="py-6 text-center text-sm text-zinc-400">
              Belum ada anggota aktif. Tambahkan anggota di halaman Anggota.
            </p>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-4 py-3 font-medium">No</th>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {members.map((m, idx) => {
                    const paid = isPaid(m.id)
                    return (
                      <tr key={m.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 text-zinc-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-zinc-800">{m.name}</td>
                        <td className="px-4 py-3">
                          {paid ? (
                            <Badge variant="green">Lunas</Badge>
                          ) : (
                            <Badge variant="red">Belum Bayar</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant={paid ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => togglePaid(m.id)}
                          >
                            {paid ? 'Batalkan' : 'Tandai Lunas'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {members.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedIds(new Set(members.filter((m) => !isPaid(m.id)).map((m) => m.id)))
              setBatchMode(true)
            }}
          >
            Tandai Semua Belum Bayar Jadi Lunas
          </Button>
        </div>
      )}

      {batchMode ? (
        <form onSubmit={handleBatchMark} className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            Tandai {selectedIds.size} siswa berikut sebagai lunas ({formatIDR(totalAmount)}/siswa)
          </p>
          {selectedIds.size > 0 && (
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setBatchMode(false); setSelectedIds(new Set()) }}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={batchSaving}>
                {batchSaving ? 'Menyimpan…' : 'Konfirmasi'}
              </Button>
            </div>
          )}
        </form>
      ) : null}
    </div>
  )
}