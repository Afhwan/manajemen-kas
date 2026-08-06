import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPERADMIN_ONLY_PATHS = ['/pengguna']
const PUBLIC_PATHS = ['/login', '/kas']

// Hanya jalankan proxy untuk navigasi halaman. Aset statis (_next/static,
// _next/image, favicon, dan file statis lain) dilewati agar tidak diarahkan
// ke /login (mengakibatkan MIME type error di browser).
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|ttf|otf|eot|css|js|map|txt|xml|json|pdf)$).*)',
  ],
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // /kas murni publik dan tidak memakai hasil sesi, jadi lewati pengecekan
  // sesi di sana agar halaman publik tidak memicu refresh token.
  const needsSessionCheck = !isPublicPath || pathname.startsWith('/login')

  let user: { id: string } | null = null
  if (needsSessionCheck) {
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      // Sesi basi / refresh token ditolak (mis. setelah reset database) —
      // perlakukan sebagai belum login.
      user = null
    }
  }

  if (!user) {
    // Cookie sesi basi masih terkirim di request ini. Hapus dari response
    // agar browser tidak mengirim ulang dan memicu error
    // "Invalid Refresh Token" di setiap request berikutnya.
    clearStaleSessionCookies(request, supabaseResponse)
  }

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (user && !isPublicPath) {
    try {
      const { data: profile } = await supabase.rpc('get_app_user', {
        p_uid: user.id,
      })

      const role = (profile as { role?: string } | null)?.role ?? null
      const isBendahara = role === 'bendahara'

      // Bendahara tidak boleh akses Kelola Pengguna.
      if (isBendahara && SUPERADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    } catch {
      // Jika lookup role gagal, jangan blokir routing.
    }
  }

  return supabaseResponse
}

function clearStaleSessionCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) {
      response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
    }
  }
}
