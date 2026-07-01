import { Dashboard } from "@/components/dashboard"
import { createClient } from "@/lib/supabase/server"
import { getBracket, type Bracket } from "@/lib/football-data"
import type { AuthUser, SavedPrediction } from "@/lib/types"

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
  const predictions: Record<string, SavedPrediction> = {}

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle()

    authUser = {
      id: user.id,
      email: user.email ?? "",
      username:
        profile?.username ?? user.email?.split("@")[0] ?? "player",
    }

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
  }

  return (
    <Dashboard
      user={authUser}
      initialPredictions={predictions}
      initialBracket={initialBracket}
    />
  )
}
