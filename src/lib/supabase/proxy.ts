import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const EDIT_ONLY_PATHS = ['/members', '/transactions', '/iuran', '/settings']

export async function updateSession(request: NextRequest) {
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
  const isLoginPage = pathname.startsWith('/login')

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Walikelas hanya boleh melihat Dashboard & Laporan.
  if (user && !isLoginPage) {
    try {
      const { data: profile } = await supabase
        .from('app_users')
        .select('role')
        .eq('id', user.id)
        .single()

      const isWalikelas = profile?.role === 'walikelas'
      const isEditOnly = EDIT_ONLY_PATHS.some((p) => pathname.startsWith(p))

      if (isWalikelas && isEditOnly) {
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
