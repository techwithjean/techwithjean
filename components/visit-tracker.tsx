"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

/**
 * Fires a lightweight, fire-and-forget beacon to /api/track on every route
 * change so we can build first-party visit stats in Supabase. Skips admin
 * pages so our own dashboard views don't inflate the numbers.
 */
export function VisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return
    const controller = new AbortController()
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {})
    return () => controller.abort()
  }, [pathname])

  return null
}
