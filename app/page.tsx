import { Dashboard } from "@/components/dashboard"
import { createClient } from "@/lib/supabase/server"
import { getBracket, type Bracket } from "@/lib/football-data"
import type { AuthUser, SavedPrediction } from "@/lib/types"
import type { LeagueWithStandings, StandingEntry } from "@/lib/leagues"

export const dynamic = "force-dynamic"

export default async function Page() {
  let initialBracket: Bracket = {
    rounds: [],
    updatedAt: "",
    hasLiveActivity: false,
  }
  try {
    initialBracket = await getBracket()
  } catch (err) {
    console.log("[v0] Failed to load bracket:", (err as Error).message)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let authUser: AuthUser | null = null
  let initialFavorite: string | null = null
  let needsOnboarding = false
  let leagues: LeagueWithStandings[] = []
  const predictions: Record<string, SavedPrediction> = {}

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, favorite_team, onboarded")
      .eq("id", user.id)
      .maybeSingle()

    authUser = {
      id: user.id,
      email: user.email ?? "",
      username: profile?.username ?? user.email?.split("@")[0] ?? "player",
    }
    initialFavorite = profile?.favorite_team ?? null
    // No profile row or not yet onboarded → run first-login onboarding.
    needsOnboarding = !profile || !profile.onboarded

    const { data: rows } = await supabase
      .from("predictions")
      .select("match_id, predicted_a, predicted_b")
      .eq("user_id", user.id)

    for (const row of rows ?? []) {
      predictions[row.match_id] = {
        a: row.predicted_a,
        b: row.predicted_b,
      }
    }

    leagues = await loadLeagues(supabase, user.id)
  }

  // Only surface an auto-joined banner during first-login onboarding, when the
  // only way the user already has a league is an invite-link join.
  const autoJoinedLeagueName =
    needsOnboarding && leagues.length > 0 ? leagues[0].name : null

  return (
    <Dashboard
      user={authUser}
      initialPredictions={predictions}
      initialBracket={initialBracket}
      initialFavorite={initialFavorite}
      leagues={leagues}
      needsOnboarding={needsOnboarding}
      autoJoinedLeagueName={autoJoinedLeagueName}
    />
  )
}

/** Load every league the user belongs to, each with ordered standings. */
async function loadLeagues(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<LeagueWithStandings[]> {
  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("user_id", userId)

  const leagueIds = (memberships ?? []).map((m) => m.league_id)
  if (leagueIds.length === 0) return []

  const { data: leagueRows } = await supabase
    .from("leagues")
    .select("id, name, invite_code, owner_id, created_at")
    .in("id", leagueIds)
    .order("created_at", { ascending: true })

  const { data: memberRows } = await supabase
    .from("league_members")
    .select("league_id, user_id, joined_at")
    .in("league_id", leagueIds)
    .order("joined_at", { ascending: true })

  const memberUserIds = [...new Set((memberRows ?? []).map((m) => m.user_id))]
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", memberUserIds)

  const nameById = new Map(
    (profileRows ?? []).map((p) => [p.id, p.username as string]),
  )

  return (leagueRows ?? []).map((l) => {
    const members: StandingEntry[] = (memberRows ?? [])
      .filter((m) => m.league_id === l.id)
      .map((m, i) => ({
        rank: i + 1,
        userId: m.user_id,
        username: nameById.get(m.user_id) ?? "player",
        points: 0, // Placeholder until scoring is implemented.
        isYou: m.user_id === userId,
      }))

    return {
      id: l.id,
      name: l.name,
      inviteCode: l.invite_code,
      ownerId: l.owner_id,
      createdAt: l.created_at,
      members,
    }
  })
}
