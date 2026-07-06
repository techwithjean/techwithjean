"use client"

import { useEffect, useState } from "react"
import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { saveThemePreference } from "@/app/actions/theme"

export function ThemeToggle({
  className,
  variant = "outline",
  canPersist = false,
}: {
  className?: string
  variant?: "outline" | "ghost"
  /** When true, the chosen theme is saved to the signed-in user's profile. */
  canPersist?: boolean
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // The resolved theme is only known on the client, so keep the label and icon
  // stable until mounted to avoid a server/client hydration mismatch.
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === "dark"
  const label = !mounted
    ? "Toggle theme"
    : isDark
      ? "Switch to light mode"
      : "Switch to dark mode"

  function toggle() {
    const next = isDark ? "light" : "dark"
    setTheme(next)
    // Persist the choice for signed-in users so it follows them across devices.
    // Fire-and-forget: the local switch already happened optimistically.
    if (canPersist) void saveThemePreference(next)
  }

  return (
    <Button
      variant={variant}
      size="icon"
      className={cn(className)}
      aria-label={label}
      onClick={toggle}
    >
      {mounted && isDark ? (
        <SunIcon className="size-4" />
      ) : (
        <MoonIcon className="size-4" />
      )}
    </Button>
  )
}
