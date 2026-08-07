'use client'

import { useState, type FormEvent } from 'react'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await login(formData)
    if (result && 'error' in result) {
      setError(result.error as string)
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white/80 shadow-sm">
        <div className="border-b-4 border-maroon-600 bg-maroon-700 px-6 py-8 text-paper">
          <p className="text-xs uppercase tracking-widest text-maroon-200">Manajemen Kas XI Sija</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Manajemen Kas XI Sija</h1>
          <p className="mt-2 text-sm text-maroon-100">
            Catat pemasukan dan pengeluaran keuangan kelas dengan rapi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <Field label="Username">
            <Input name="username" required autoComplete="username" placeholder="Username Anda" />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="Password Anda"
            />
          </Field>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? 'Memproses…' : 'Masuk'}
          </Button>
        </form>
      </div>
    </div>
  )
}
