'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await login(formData)

    if (result && 'error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 via-brand-800 to-brand-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white font-display text-2xl font-bold text-brand-700 shadow-lg">
            K
          </div>
          <h1 className="font-display text-3xl font-bold">Kas Kelas</h1>
          <p className="mt-1 text-sm text-white/80">Kelola duit kas kelasmu</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-xl"
        >
          <Field label="Email">
            <Input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="bendahara@sekolah.sch.id"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </Field>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <Spinner className="border-white/40 border-t-white" /> : null}
            Masuk
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-white/70">
          Login khusus bendahara/admin yang udah didaftarin di Supabase Auth.
        </p>
      </div>
    </div>
  )
}
