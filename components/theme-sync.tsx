"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import type { Theme } from "@/app/actions/theme"

/**
 * Applies a signed-in user's saved theme when the app loads, so their choice
 * follows them across devices ("switch to user theme at login"). next-themes
 * reads localStorage before paint for returning visitors; this only overrides
 * it once per mount when the account has a stored preference that differs,
 * keeping the DB as the source of truth for logged-in users.
 */
export function ThemeSync({ preferredTheme }: { preferredTheme: Theme | null }) {
  const { setTheme } = useTheme()
  const applied = useRef(false)

  useEffect(() => {
    if (applied.current || !preferredTheme) return
    applied.current = true
    setTheme(preferredTheme)
  }, [preferredTheme, setTheme])

  return null
}
