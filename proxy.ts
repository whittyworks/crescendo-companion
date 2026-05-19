import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { env } from '@/lib/env'

// Next.js 16 renamed Middleware to Proxy. File must be `proxy.ts` at the
// project root and the exported function must be named `proxy`.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // Required so @supabase/ssr can refresh the auth tokens and re-set the
  // session cookie. Do not add other DB queries here — the proxy runs on
  // every matched request, including prefetches.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (user && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  if (
    !user &&
    (pathname.startsWith('/chat') || pathname.startsWith('/no-access'))
  ) {
    return NextResponse.redirect(new URL('/auth?mode=signin', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
