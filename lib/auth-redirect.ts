/**
 * Builds the URL Supabase should redirect back to after an email confirmation,
 * magic link, OAuth sign-in, or password recovery.
 *
 * IMPORTANT: `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` is a development-only
 * convenience. Because it is a `NEXT_PUBLIC_` variable it gets inlined into the
 * production client bundle at build time, so if it is ever read in production it
 * will send real users to a localhost / preview URL (which they can't reach).
 * To prevent that, we only honor the override when actually running on
 * localhost. In every real deployment we use the current origin, so links in
 * emails always point back to the live site (e.g. https://myfinalscup.com).
 */
export function getAuthCallbackUrl(next?: string): string {
  // Server-side / SSR safety: return a relative path if there is no window.
  if (typeof window === "undefined") {
    const base = "/auth/callback"
    return next ? `${base}?next=${encodeURIComponent(next)}` : base
  }

  const { origin, hostname } = window.location
  const isLocalDev = hostname === "localhost" || hostname === "127.0.0.1"
  const devOverride = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL

  const base = isLocalDev && devOverride ? devOverride : `${origin}/auth/callback`

  if (!next) return base
  const separator = base.includes("?") ? "&" : "?"
  return `${base}${separator}next=${encodeURIComponent(next)}`
}
