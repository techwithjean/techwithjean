import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`)

      // If the user arrived via an invite link before authenticating, complete
      // the pending league join now that they have a session, then clear it.
      const pendingInvite = request.cookies.get("pending_invite")?.value
      if (pendingInvite) {
        await supabase.rpc("join_league_by_code", { _code: pendingInvite })
        response.cookies.delete("pending_invite")
      }

      return response
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
