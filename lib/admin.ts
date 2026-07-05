import "server-only"
import { createClient } from "@/lib/supabase/server"

/**
 * Parse the ADMIN_EMAILS env var (comma-separated) into a normalized set.
 * Kept server-only so the allowlist never ships to the client.
 */
function adminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? ""
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

/** Returns true when the given email is in the admin allowlist. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmailSet().has(email.trim().toLowerCase())
}

/**
 * Returns the current signed-in user's email if they are an allowlisted
 * admin, otherwise null. Used to gate the admin stats page.
 */
export async function getAdminUser(): Promise<{ email: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !isAdminEmail(user.email)) return null
  return { email: user.email }
}
