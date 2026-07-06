"use server"

import { createClient } from "@/lib/supabase/server"

export type Theme = "light" | "dark"

export type SaveThemeResult =
  | { ok: true; theme: Theme }
  | { ok: false; error: string }

/**
 * Persist the current user's theme onto their profile row so it follows them
 * across devices and is applied at login. RLS restricts updates to the user's
 * own row, and we also scope the write to their id.
 */
export async function saveThemePreference(
  theme: Theme,
): Promise<SaveThemeResult> {
  if (theme !== "light" && theme !== "dark") {
    return { ok: false, error: "Invalid theme." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: "You must be signed in to save a theme." }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ theme_preference: theme })
    .eq("id", user.id)

  if (error) {
    return { ok: false, error: error.message }
  }

  // No revalidatePath: the theme is applied client-side via next-themes, so a
  // server re-render isn't needed and would cause a needless refetch.
  return { ok: true, theme }
}
