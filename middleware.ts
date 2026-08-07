import type { NextRequest } from 'next/server'
import { proxy } from './src/proxy'

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|ttf|otf|eot|css|js|map|txt|xml|json|pdf)$).*)',
  ],
}

export async function middleware(request: NextRequest) {
  return proxy(request)
}
