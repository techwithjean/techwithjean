"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type SaveFavoriteTeamResult =
  | { ok: true; favorite: string | null }
  | { ok: false; error: string }

/**
 * Persist the current user's favorite team onto their profile row. RLS ensures
 * a user can only update their own profile, but we also resolve the user
 * server-side and scope the write to their id. Passing null clears the choice.
 */
export async function saveFavoriteTeam(
  team: string | null,
): Promise<SaveFavoriteTeamResult> {
  const favorite = team && team.trim().length ? team.trim() : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: "You must be signed in to save a favorite team." }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ favorite_team: favorite })
    .eq("id", user.id)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath("/")
  return { ok: true, favorite }
}
