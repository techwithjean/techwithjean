"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type UpdateDisplayNameResult =
  | { ok: true; username: string }
  | { ok: false; error: string }

/**
 * Update the current user's display name (profiles.username). RLS restricts
 * updates to the user's own row, and we also scope the write to their id.
 */
export async function updateDisplayName(
  name: string,
): Promise<UpdateDisplayNameResult> {
  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > 40) {
    return { ok: false, error: "Name must be 1-40 characters." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You must be signed in." }

  // Upsert so a missing profile row (e.g. never onboarded) is created too.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, username: trimmed }, { onConflict: "id" })

  if (error) return { ok: false, error: "Could not update your name." }

  revalidatePath("/")
  return { ok: true, username: trimmed }
}
