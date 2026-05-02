import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
    
    if (next === '/reset-password') {
      return NextResponse.redirect(`${origin}${next}`)
    }

    // The user requested that after email verification, they are taken to the login page.
    // We sign them out so they are forced to log in manually as requested.
    await supabase.auth.signOut()
    
    return NextResponse.redirect(`${origin}/login?message=Email verified successfully. Please log in to continue.`)
  }

  // Fallback if no code is present
  return NextResponse.redirect(`${origin}/login`)
}
