import { Dashboard } from "@/components/dashboard"
import { LandingPage } from "@/components/marketing/landing-page"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBracket, type Bracket } from "@/lib/football-data"
import { finalResultsFromBracket, totalPointsByUser } from "@/lib/scoring"
import type { AuthUser, SavedPrediction } from "@/lib/types"
import type { LeagueWithStandings, StandingEntry } from "@/lib/leagues"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Smart homepage: logged-out visitors get the public, crawlable marketing
  // landing page (best for SEO); signed-in users get the app dashboard exactly
  // as before. This keeps the app experience unchanged for existing users.
  if (!user) {
    return <LandingPage />
  }

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

  let authUser: AuthUser | null = null
  let isAdmin = false
  let initialFavorite: string | null = null
  let needsOnboarding = false
  let leagues: LeagueWithStandings[] = []
  const predictions: Record<string, SavedPrediction> = {}

  {
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
    isAdmin = isAdminEmail(user.email)
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

    // Grade every finished match against members' predictions to build real
    // standings (3 = exact score, 1 = correct outcome).
    const results = finalResultsFromBracket(initialBracket)
    leagues = await loadLeagues(supabase, user.id, results)
  }

  // Only surface an auto-joined banner during first-login onboarding, when the
  // only way the user already has a league is an invite-link join.
  const autoJoinedLeagueName =
    needsOnboarding && leagues.length > 0 ? leagues[0].name : null

  return (
    <Dashboard
      user={authUser}
      isAdmin={isAdmin}
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
  results: Map<string, { a: number; b: number }>,
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

  // Read every member's predictions to grade standings. RLS restricts the
  // user-scoped client to its own rows, so use the trusted service-role client
  // and scope the read explicitly to this set of member ids.
  const admin = createAdminClient()
  const { data: predictionRows } = await admin
    .from("predictions")
    .select("user_id, match_id, predicted_a, predicted_b")
    .in("user_id", memberUserIds)

  const pointsByUser = totalPointsByUser(predictionRows ?? [], results)

  return (leagueRows ?? []).map((l) => {
    const members: StandingEntry[] = (memberRows ?? [])
      .filter((m) => m.league_id === l.id)
      .map((m) => ({
        userId: m.user_id,
        username: nameById.get(m.user_id) ?? "player",
        points: pointsByUser.get(m.user_id) ?? 0,
        isYou: m.user_id === userId,
        joinedAt: m.joined_at as string,
      }))
      // Rank by points (highest first); break ties by who joined earliest.
      .sort(
        (a, b) =>
          b.points - a.points ||
          Date.parse(a.joinedAt) - Date.parse(b.joinedAt),
      )
      .map((m, i) => ({
        rank: i + 1,
        userId: m.userId,
        username: m.username,
        points: m.points,
        isYou: m.isYou,
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
