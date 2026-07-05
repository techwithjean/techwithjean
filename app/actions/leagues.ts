"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  generateInviteCode,
  normalizeInviteCode,
  type League,
} from "@/lib/leagues"

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

function mapLeagueRow(row: {
  id: string
  name: string
  invite_code: string
  owner_id: string
  created_at: string
}): League {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  }
}

/**
 * Create a new league owned by the current user and add them as the first
 * member. Retries on the (extremely unlikely) invite-code collision.
 */
export async function createLeague(
  name: string,
): Promise<ActionResult<League>> {
  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > 60) {
    return { ok: false, error: "League name must be 1-60 characters." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You must be signed in." }

  // Try a few times in case of a unique invite_code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode()
    const { data, error } = await supabase
      .from("leagues")
      .insert({ name: trimmed, invite_code: inviteCode, owner_id: user.id })
      .select("id, name, invite_code, owner_id, created_at")
      .single()

    if (error) {
      // 23505 = unique_violation; retry with a fresh code.
      if (error.code === "23505") continue
      return { ok: false, error: "Could not create league." }
    }

    const { error: memberError } = await supabase
      .from("league_members")
      .insert({ league_id: data.id, user_id: user.id })
    if (memberError && memberError.code !== "23505") {
      return { ok: false, error: "Could not join the new league." }
    }

    revalidatePath("/")
    return { ok: true, data: mapLeagueRow(data) }
  }

  return { ok: false, error: "Could not generate a unique invite code." }
}

/**
 * Join an existing league by its invite code via the security-definer RPC,
 * which handles lookup + membership insert without exposing all leagues.
 */
export async function joinLeagueByCode(
  code: string,
): Promise<ActionResult<League>> {
  const normalized = normalizeInviteCode(code)
  if (!normalized) return { ok: false, error: "Enter an invite code." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You must be signed in." }

  const { data, error } = await supabase.rpc("join_league_by_code", {
    _code: normalized,
  })

  if (error) {
    if (error.code === "no_data_found") {
      return { ok: false, error: "No league found with that code." }
    }
    return { ok: false, error: "Could not join league." }
  }

  revalidatePath("/")
  return { ok: true, data: mapLeagueRow(data) }
}

/**
 * Remove the current user from a league. If the departing user is the owner,
 * ownership transfers to the earliest-joined remaining member; if no members
 * remain, the league is deleted. Membership/ownership writes use the trusted
 * admin client, always scoped to the authenticated user's id.
 */
export async function leaveLeague(
  leagueId: string,
): Promise<ActionResult> {
  if (!leagueId) return { ok: false, error: "Missing league." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You must be signed in." }

  const admin = createAdminClient()

  // Confirm the league exists and whether this user owns it.
  const { data: league } = await admin
    .from("leagues")
    .select("id, owner_id")
    .eq("id", leagueId)
    .maybeSingle()
  if (!league) return { ok: false, error: "League not found." }

  // Remove this user's membership (scoped to their id).
  const { error: delError } = await admin
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
  if (delError) return { ok: false, error: "Could not leave the league." }

  // If the owner left, hand off ownership or clean up an empty league.
  if (league.owner_id === user.id) {
    const { data: remaining } = await admin
      .from("league_members")
      .select("user_id")
      .eq("league_id", leagueId)
      .order("joined_at", { ascending: true })
      .limit(1)

    if (remaining && remaining.length > 0) {
      await admin
        .from("leagues")
        .update({ owner_id: remaining[0].user_id })
        .eq("id", leagueId)
    } else {
      // No members left — delete the now-empty league.
      await admin.from("leagues").delete().eq("id", leagueId)
    }
  }

  revalidatePath("/")
  return { ok: true }
}

/**
 * Verify the current user owns the given league. Returns the auth'd user id
 * and a service-role client on success, or an error result otherwise.
 */
async function requireOwner(
  leagueId: string,
): Promise<
  | { ok: true; userId: string; admin: ReturnType<typeof createAdminClient> }
  | { ok: false; error: string }
> {
  if (!leagueId) return { ok: false, error: "Missing league." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You must be signed in." }

  const admin = createAdminClient()
  const { data: league } = await admin
    .from("leagues")
    .select("owner_id")
    .eq("id", leagueId)
    .maybeSingle()
  if (!league) return { ok: false, error: "League not found." }
  if (league.owner_id !== user.id) {
    return { ok: false, error: "Only the league owner can do that." }
  }

  return { ok: true, userId: user.id, admin }
}

/** Rename a league. Owner only. */
export async function renameLeague(
  leagueId: string,
  name: string,
): Promise<ActionResult> {
  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > 60) {
    return { ok: false, error: "League name must be 1-60 characters." }
  }

  const auth = await requireOwner(leagueId)
  if (!auth.ok) return auth

  const { error } = await auth.admin
    .from("leagues")
    .update({ name: trimmed })
    .eq("id", leagueId)
  if (error) return { ok: false, error: "Could not rename the league." }

  revalidatePath("/")
  return { ok: true }
}

/**
 * Permanently delete a league and all its memberships. Owner only. The UI
 * warns the owner when other members will be affected.
 */
export async function deleteLeague(
  leagueId: string,
): Promise<ActionResult> {
  const auth = await requireOwner(leagueId)
  if (!auth.ok) return auth

  // Remove memberships first, then the league itself.
  await auth.admin.from("league_members").delete().eq("league_id", leagueId)
  const { error } = await auth.admin
    .from("leagues")
    .delete()
    .eq("id", leagueId)
  if (error) return { ok: false, error: "Could not delete the league." }

  revalidatePath("/")
  return { ok: true }
}

/**
 * Transfer league ownership to another member ("promote to admin/owner").
 * Owner only. The new owner must already be a member of the league.
 */
export async function transferOwnership(
  leagueId: string,
  newOwnerId: string,
): Promise<ActionResult> {
  if (!newOwnerId) return { ok: false, error: "Choose a member to promote." }

  const auth = await requireOwner(leagueId)
  if (!auth.ok) return auth
  if (newOwnerId === auth.userId) {
    return { ok: false, error: "You already own this league." }
  }

  // Confirm the target is a member of this league.
  const { data: membership } = await auth.admin
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId)
    .eq("user_id", newOwnerId)
    .maybeSingle()
  if (!membership) {
    return { ok: false, error: "That person is not in this league." }
  }

  const { error } = await auth.admin
    .from("leagues")
    .update({ owner_id: newOwnerId })
    .eq("id", leagueId)
  if (error) return { ok: false, error: "Could not transfer ownership." }

  revalidatePath("/")
  return { ok: true }
}

/**
 * Finalize first-login onboarding: upsert the profile (creating the row if it
 * doesn't exist yet — e.g. for Google sign-ins) with the chosen favorite team
 * and mark the user as onboarded so the dialog doesn't show again.
 */
export async function completeOnboarding(
  favoriteTeam: string | null,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You must be signed in." }

  // Preserve an already-chosen username; otherwise derive one from auth
  // metadata (email form / Google) so Google sign-ins get a real profile row.
  const { data: existing } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle()

  const username =
    existing?.username ??
    (user.user_metadata?.username as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "player"

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      username,
      favorite_team: favoriteTeam,
      onboarded: true,
    },
    { onConflict: "id", ignoreDuplicates: false },
  )

  if (error) return { ok: false, error: "Could not save your preferences." }

  revalidatePath("/")
  return { ok: true }
}
