import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// Pin origin to the configured site URL to prevent host-header injection
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? ''

// Allowlist of internal paths that the `next` parameter may redirect to
const ALLOWED_NEXT_PATHS = new Set(['/reset-password'])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    if (next && ALLOWED_NEXT_PATHS.has(next)) {
      return NextResponse.redirect(`${SITE_ORIGIN}${next}`)
    }

    // The user requested that after email verification, they are taken to the login page.
    // We sign them out so they are forced to log in manually as requested.
    await supabase.auth.signOut()

    return NextResponse.redirect(`${SITE_ORIGIN}/login?message=Email verified successfully. Please log in to continue.`)
  }

  // Fallback if no code is present
  return NextResponse.redirect(`${SITE_ORIGIN}/login`)
}
