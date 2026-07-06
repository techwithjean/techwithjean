import "server-only"
import type { Match, MatchStatus, Round, Team } from "@/lib/tournament-data"
import type { Bracket } from "@/lib/football-data"

// API-Football (api-sports.io) — low-latency live scores. Docs: v3.football.api-sports.io
const API_BASE = "https://v3.football.api-sports.io"
const LEAGUE_WC = 1 // FIFA World Cup
const SEASON = 2026

// Normalized API-Football round string → our internal knockout round.
// (Keys are lowercased with all non-alphanumerics stripped, so "Quarter-finals"
// and "Quarterfinals" both match. "3rd Place Final" is intentionally absent so
// it is excluded from the knockout tree.)
const ROUND_MAP: Record<
  string,
  { id: string; name: string; shortName: string; order: number }
> = {
  roundof32: { id: "r32", name: "Round of 32", shortName: "R32", order: 0 },
  roundof16: { id: "r16", name: "Round of 16", shortName: "R16", order: 1 },
  quarterfinals: { id: "qf", name: "Quarter-finals", shortName: "QF", order: 2 },
  semifinals: { id: "sf", name: "Semi-finals", shortName: "SF", order: 3 },
  final: { id: "final", name: "Final", shortName: "Final", order: 4 },
}

function normalizeRound(round: string): string {
  return round.toLowerCase().replace(/[^a-z0-9]/g, "")
}

// API-Football fixture.status.short codes grouped into our internal statuses.
const LIVE_CODES = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"])
const FINAL_CODES = new Set(["FT", "AET", "PEN", "WO", "AWD"])
const DELAYED_CODES = new Set(["PST", "SUSP", "CANC", "ABD"])

// US broadcasters for the 2026 World Cup: FOX/FS1 (English) + Telemundo.
const ENGLISH_NETWORKS = ["FOX", "FS1"]
function networksForFixture(id: number): string[] {
  return [ENGLISH_NETWORKS[id % ENGLISH_NETWORKS.length], "Telemundo"]
}

type ApiTeam = {
  id: number | null
  name: string | null
  logo: string | null
  winner: boolean | null
}

type ApiFixture = {
  fixture: {
    id: number
    date: string
    status: { short: string; elapsed: number | null }
    venue: { name: string | null; city: string | null }
  }
  league: { round: string }
  teams: { home: ApiTeam; away: ApiTeam }
  goals: { home: number | null; away: number | null }
}

// Sticky final: once a fixture is final, keep it final across refreshes so a
// transient status blip can't flip a completed match back to live.
const finalFixtureIds = new Set<number>()
// Last known non-null scores, so a momentary blank score doesn't wipe a result.
const lastKnownScores = new Map<number, { home: number; away: number }>()

function mapStatus(fixtureId: number, short: string): MatchStatus {
  if (FINAL_CODES.has(short)) {
    finalFixtureIds.add(fixtureId)
    return "final"
  }
  if (finalFixtureIds.has(fixtureId)) return "final"
  if (LIVE_CODES.has(short)) return "live"
  if (DELAYED_CODES.has(short)) return "delayed"
  return "upcoming" // NS, TBD
}

function mapTeam(t: ApiTeam): Team | null {
  if (!t || !t.name) return null
  return {
    name: t.name,
    code: "", // API-Football has no ISO code; the crest/logo is used instead.
    crestUrl: t.logo || undefined,
  }
}

function venueForFixture(v: { name: string | null; city: string | null }): string {
  const parts = [v.name, v.city].filter(Boolean)
  return parts.join(", ")
}

function mapFixture(f: ApiFixture): Match {
  const kickoffMs = Date.parse(f.fixture.date)

  // Prefer the current score, falling back to the last known good one.
  let home = f.goals.home
  let away = f.goals.away
  if (home != null && away != null) {
    lastKnownScores.set(f.fixture.id, { home, away })
  } else {
    const cached = lastKnownScores.get(f.fixture.id)
    if (cached) {
      home = cached.home
      away = cached.away
    }
  }

  const round = ROUND_MAP[normalizeRound(f.league.round)]

  return {
    id: `af-${f.fixture.id}`,
    roundId: round?.id ?? normalizeRound(f.league.round),
    a: { team: mapTeam(f.teams.home), score: home },
    b: { team: mapTeam(f.teams.away), score: away },
    city: venueForFixture(f.fixture.venue),
    kickoffISO: f.fixture.date,
    kickoffOffsetMin: Math.round((kickoffMs - Date.now()) / 60_000),
    networks: networksForFixture(f.fixture.id),
    status: mapStatus(f.fixture.id, f.fixture.status.short),
  }
}

// Knockout rounds in bracket order — used to advance winners into the next round.
const KNOCKOUT_ORDER = ["r32", "r16", "qf", "sf", "final"]

/** Our internal round id for a fixture, or undefined for non-knockout rounds. */
function fixtureRoundId(f: ApiFixture): string | undefined {
  return ROUND_MAP[normalizeRound(f.league.round)]?.id
}

function isFixtureFinished(f: ApiFixture): boolean {
  return FINAL_CODES.has(f.fixture.status.short) || finalFixtureIds.has(f.fixture.id)
}

/** The winning team of a finished fixture (respects extra time / penalties). */
function fixtureWinner(f: ApiFixture): ApiTeam | null {
  if (!isFixtureFinished(f)) return null
  const { home, away } = f.teams
  if (home.winner === true) return home
  if (away.winner === true) return away
  // Fall back to goals if the winner flag is missing.
  const { home: hg, away: ag } = f.goals
  if (hg != null && ag != null) {
    if (hg > ag) return home
    if (ag > hg) return away
  }
  return null
}

/**
 * API-Football fills a next-round fixture's teams only once its own record is
 * updated, which lags behind the final whistle of the feeder matches. We
 * resolve advancement ourselves so a winner (e.g. Norway beating Brazil) drops
 * into the next round immediately.
 *
 * Within a round, fixtures are paired by consecutive id `(lo, hi)`; that pair
 * feeds one next-round fixture. We fill an empty next-round slot two ways:
 *   1. If the API has already placed one team, use it to identify the feeder
 *      pair, then fill the remaining slot from that pair's other winner.
 *   2. If the slot is completely empty (the sibling match hasn't been played
 *      yet), fall back to positional mapping — pair k feeds next[k] — so a
 *      winner still advances before its future opponent is decided.
 * We never overwrite a team the API already provides, and never duplicate a
 * team that is already in the fixture.
 */
function resolveAdvancement(fixtures: ApiFixture[]): void {
  for (let i = 0; i < KNOCKOUT_ORDER.length - 1; i++) {
    const prev = fixtures
      .filter((f) => fixtureRoundId(f) === KNOCKOUT_ORDER[i])
      .sort((a, b) => a.fixture.id - b.fixture.id)
    const next = fixtures
      .filter((f) => fixtureRoundId(f) === KNOCKOUT_ORDER[i + 1])
      .sort((a, b) => a.fixture.id - b.fixture.id)
    if (prev.length === 0 || next.length === 0) continue

    // Consecutive-id feeder pairs: [lo, hi].
    const pairs: [ApiFixture, ApiFixture][] = []
    for (let j = 0; j + 1 < prev.length; j += 2) {
      pairs.push([prev[j], prev[j + 1]])
    }
    // Positional mapping is only trusted when pairs line up 1:1 with the next
    // round (a well-formed bracket, e.g. 16 R32 → 8 R16 → 4 QF).
    const aligned = pairs.length === next.length

    for (let k = 0; k < next.length; k++) {
      const nf = next[k]
      const presentIds = new Set(
        [nf.teams.home.id, nf.teams.away.id].filter((x): x is number => x != null),
      )
      if (presentIds.size === 2) continue // already full

      // 1. Identify the feeder pair from a team the API already placed…
      let pair = pairs.find(([lo, hi]) => {
        const ids = [fixtureWinner(lo)?.id, fixtureWinner(hi)?.id]
        return [...presentIds].some((id) => ids.includes(id))
      })
      // 2. …otherwise, for a completely empty slot, use positional mapping.
      if (!pair && presentIds.size === 0 && aligned) pair = pairs[k]
      if (!pair) continue

      const [lo, hi] = pair
      const toPlace = [fixtureWinner(lo), fixtureWinner(hi)].filter(
        (w): w is ApiTeam => w != null && w.id != null && !presentIds.has(w.id),
      )
      if (nf.teams.home.id == null && toPlace.length) {
        nf.teams.home = toPlace.shift()!
      }
      if (nf.teams.away.id == null && toPlace.length) {
        nf.teams.away = toPlace.shift()!
      }
    }
  }
}

/**
 * Fetch the knockout bracket from API-Football and map it onto the app's
 * Round/Match model. Throws on missing key, HTTP error, rate limit, or an empty
 * knockout set so the caller can fall back to the secondary provider.
 */
export async function fetchApiFootballBracket(): Promise<Bracket> {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) throw new Error("API_FOOTBALL_KEY is not set")

  const res = await fetch(
    `${API_BASE}/fixtures?league=${LEAGUE_WC}&season=${SEASON}`,
    {
      headers: { "x-apisports-key": apiKey },
      cache: "no-store",
    },
  )

  if (!res.ok) {
    throw new Error(`API-Football responded ${res.status} ${res.statusText}`)
  }

  const data: { response: ApiFixture[]; errors?: unknown } = await res.json()

  // API-Football returns 200 with an `errors` payload for auth/quota problems.
  if (
    data.errors &&
    ((Array.isArray(data.errors) && data.errors.length > 0) ||
      (typeof data.errors === "object" &&
        Object.keys(data.errors as object).length > 0))
  ) {
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`)
  }

  const fixtures = data.response ?? []

  // Advance winners into the next round ourselves, since API-Football lags in
  // filling next-round fixtures after a feeder match's final whistle.
  resolveAdvancement(fixtures)

  // Keep only knockout-stage fixtures (drops group stage & 3rd-place).
  const buckets = new Map<string, Match[]>()
  for (const f of fixtures) {
    const round = ROUND_MAP[normalizeRound(f.league.round)]
    if (!round) continue
    const list = buckets.get(round.id) ?? []
    list.push(mapFixture(f))
    buckets.set(round.id, list)
  }

  const rounds: Round[] = Object.values(ROUND_MAP)
    .sort((a, b) => a.order - b.order)
    .map(({ id, name, shortName }) => ({
      id,
      name,
      shortName,
      matches: (buckets.get(id) ?? []).sort(
        (a, b) => Date.parse(a.kickoffISO) - Date.parse(b.kickoffISO),
      ),
    }))
    .filter((r) => r.matches.length > 0)

  if (rounds.length === 0) {
    throw new Error("API-Football returned no knockout fixtures")
  }

  const hasLiveActivity = rounds.some((r) =>
    r.matches.some((m) => m.status === "live" || m.status === "delayed"),
  )

  return { rounds, updatedAt: new Date().toISOString(), hasLiveActivity }
}
