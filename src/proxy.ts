import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPERADMIN_ONLY_PATHS = ['/pengguna']
const PUBLIC_PATHS = ['/login', '/kas']

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

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
