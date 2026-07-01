"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type SavePredictionResult =
  | { ok: true; a: number; b: number }
  | { ok: false; error: string }

/**
 * Persist (insert or update) the current user's predicted scoreline for a
 * match. RLS guarantees a user can only write their own row, but we also
 * resolve the user server-side and scope the write to their id.
 */
export async function savePrediction(
  matchId: string,
  a: number,
  b: number,
): Promise<SavePredictionResult> {
  if (!matchId) return { ok: false, error: "Missing match." }

  const clampedA = Math.max(0, Math.min(30, Math.round(a)))
  const clampedB = Math.max(0, Math.min(30, Math.round(b)))

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: "You must be signed in to make a prediction." }
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      match_id: matchId,
      predicted_a: clampedA,
      predicted_b: clampedB,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,match_id" },
  )

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath("/")
  return { ok: true, a: clampedA, b: clampedB }
}
