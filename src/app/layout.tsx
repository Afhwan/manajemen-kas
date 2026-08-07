import type { Metadata } from 'next'
import { Fraunces } from 'next/font/google'
import { ToastProvider } from '@/components/ui/Toast'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Manajemen Kas XI Sija',
  description: 'Aplikasi pengelolaan keuangan kelas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={fraunces.variable}>
      <body className="min-h-dvh bg-paper text-ink" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
