import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { normalizeInviteCode } from "@/lib/leagues"

/**
 * Invite link handler. If the visitor is signed in, join the league by its
 * code immediately and send them to the dashboard. If not, remember the code
 * in a short-lived cookie and route them to sign-up — the auth callback (and
 * the `next` redirect back here) will auto-join them once authenticated.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params
  const code = normalizeInviteCode(decodeURIComponent(rawCode))
  const origin = request.nextUrl.origin

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data, error } = await supabase.rpc("join_league_by_code", {
      _code: code,
    })
    if (error || !data) {
      return NextResponse.redirect(`${origin}/?invite=notfound`)
    }
    return NextResponse.redirect(`${origin}/?joined=${data.id}`)
  }

  // Not signed in: stash the invite and send them to sign up, preserving the
  // return path so they land back here (authenticated) to complete the join.
  const response = NextResponse.redirect(
    `${origin}/auth/sign-up?next=${encodeURIComponent(`/join/${code}`)}`,
  )
  response.cookies.set("pending_invite", code, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  })
  return response
}
