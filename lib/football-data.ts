import "server-only"
import type { Match, MatchStatus, Round, Team } from "@/lib/tournament-data"
import { fetchApiFootballBracket } from "@/lib/api-football"

const API_BASE = "https://api.football-data.org/v4"
const COMPETITION = "WC" // FIFA World Cup

// football-data.org stages → our internal knockout round ids.
const STAGE_TO_ROUND: Record<
  string,
  { id: string; name: string; shortName: string; order: number }
> = {
  LAST_32: { id: "r32", name: "Round of 32", shortName: "R32", order: 0 },
  LAST_16: { id: "r16", name: "Round of 16", shortName: "R16", order: 1 },
  QUARTER_FINALS: { id: "qf", name: "Quarter-finals", shortName: "QF", order: 2 },
  SEMI_FINALS: { id: "sf", name: "Semi-finals", shortName: "SF", order: 3 },
  FINAL: { id: "final", name: "Final", shortName: "Final", order: 4 },
}

/**
 * Exact 2026 FIFA World Cup knockout venues, keyed by football-data.org's
 * stable match id. The free tier does not expose a per-match venue field, so
 * this is a curated map built from FIFA's published knockout schedule (each
 * fixture verified against its kickoff time). This gives the real stadium for
 * every knockout match rather than an arbitrary assignment.
 */
const VENUE_BY_MATCH_ID: Record<number, string> = {
  // Round of 32
  537417: "SoFi Stadium, Los Angeles",
  537423: "NRG Stadium, Houston",
  537415: "Gillette Stadium, Boston",
  537418: "Estadio BBVA, Monterrey",
  537424: "AT&T Stadium, Dallas",
  537416: "MetLife Stadium, New York/New Jersey",
  537425: "Estadio Azteca, Mexico City",
  537426: "Mercedes-Benz Stadium, Atlanta",
  537422: "Lumen Field, Seattle",
  537421: "Levi's Stadium, San Francisco Bay Area",
  537420: "SoFi Stadium, Los Angeles",
  537419: "BMO Field, Toronto",
  537429: "BC Place, Vancouver",
  537428: "AT&T Stadium, Dallas",
  537427: "Hard Rock Stadium, Miami",
  537430: "Arrowhead Stadium, Kansas City",
  // Round of 16
  537376: "NRG Stadium, Houston",
  537375: "Lincoln Financial Field, Philadelphia",
  537377: "MetLife Stadium, New York/New Jersey",
  537378: "Estadio Azteca, Mexico City",
  537379: "AT&T Stadium, Dallas",
  537380: "Lumen Field, Seattle",
  537381: "Mercedes-Benz Stadium, Atlanta",
  537382: "BC Place, Vancouver",
  // Quarterfinals
  537383: "Gillette Stadium, Boston",
  537384: "SoFi Stadium, Los Angeles",
  537385: "Hard Rock Stadium, Miami",
  537386: "Arrowhead Stadium, Kansas City",
  // Semifinals
  537387: "AT&T Stadium, Dallas",
  537388: "Mercedes-Benz Stadium, Atlanta",
  // Final
  537390: "MetLife Stadium, New York/New Jersey",
}

// US broadcasters for the 2026 World Cup: FOX/FS1 (English) + Telemundo (Spanish).
const ENGLISH_NETWORKS = ["FOX", "FS1"]

function venueForMatch(id: number): string {
  // Return the real venue if known; otherwise empty so the UI hides it rather
  // than showing an inaccurate location.
  return VENUE_BY_MATCH_ID[id] ?? ""
}

function networksForMatch(id: number): string[] {
  // Alternate the English network, always pair with Telemundo (Spanish).
  return [ENGLISH_NETWORKS[id % ENGLISH_NETWORKS.length], "Telemundo"]
}

type ApiTeam = {
  id: number | null
  name: string | null
  shortName: string | null
  tla: string | null
  crest: string | null
}

type ApiMatch = {
  id: number
  utcDate: string
  status: string
  minute?: number | null
  stage: string
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null
    fullTime: { home: number | null; away: number | null }
  }
}

// Knockout stages in bracket order — used to resolve advancement.
const KNOCKOUT_ORDER = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "FINAL",
]

function isFinished(m: ApiMatch): boolean {
  return m.status === "FINISHED" || m.status === "AWARDED"
}

/** The winning team of a finished match (respects penalty shootouts). */
function winnerOf(m: ApiMatch): ApiTeam | null {
  if (!isFinished(m)) return null
  if (m.score.winner === "HOME_TEAM") return m.homeTeam
  if (m.score.winner === "AWAY_TEAM") return m.awayTeam
  // Fallback to full-time score if the winner flag is missing.
  const { home, away } = m.score.fullTime
  if (home != null && away != null) {
    if (home > away) return m.homeTeam
    if (away > home) return m.awayTeam
  }
  return null
}

/**
 * football-data.org fills the next round's slots incrementally and often lags:
 * a slot can stay TBD even though its feeder match has finished (e.g. France
 * beat Sweden but isn't yet shown against Paraguay in the Round of 16).
 *
 * We resolve this ourselves. Within a round, matches pair up by consecutive id
 * `(lo, hi)`; the next-round match that receives `winner(lo)` as its home team
 * also receives `winner(hi)` as its away team. We identify each next-round
 * match's feeder pair from the team the API has ALREADY placed, then fill the
 * empty slot from that pair. We never overwrite a team the API provides.
 */
function resolveAdvancement(matches: ApiMatch[]): void {
  for (let i = 0; i < KNOCKOUT_ORDER.length - 1; i++) {
    const prev = matches
      .filter((m) => m.stage === KNOCKOUT_ORDER[i])
      .sort((a, b) => a.id - b.id)
    const next = matches.filter((m) => m.stage === KNOCKOUT_ORDER[i + 1])
    if (prev.length === 0 || next.length === 0) continue

    // Consecutive-id feeder pairs: [lo, hi].
    const pairs: [ApiMatch, ApiMatch][] = []
    for (let j = 0; j + 1 < prev.length; j += 2) {
      pairs.push([prev[j], prev[j + 1]])
    }

    for (const nm of next) {
      // Already full, or no placed team to identify the feeder pair.
      const placedIds = [nm.homeTeam.id, nm.awayTeam.id].filter(
        (x): x is number => x != null,
      )
      if (placedIds.length === 0 || placedIds.length === 2) continue

      for (const [lo, hi] of pairs) {
        const wLo = winnerOf(lo)
        const wHi = winnerOf(hi)
        const pairWinnerIds = [wLo?.id, wHi?.id].filter(
          (x): x is number => x != null,
        )
        // Is a team already placed in this match a winner from this pair?
        if (!placedIds.some((id) => pairWinnerIds.includes(id))) continue

        if (nm.homeTeam.id == null && wLo) nm.homeTeam = wLo
        if (nm.awayTeam.id == null && wHi) nm.awayTeam = wHi
        break
      }
    }
  }
}

export type Bracket = {
  rounds: Round[]
  updatedAt: string
  /** True when any match is live or delayed — used to drive faster polling. */
  hasLiveActivity: boolean
}

// Grace window: a scheduled match whose kickoff passed by more than this is
// treated as delayed (kickoff should have happened but the feed shows no play).
const DELAY_THRESHOLD_MIN = 5

// Once a match is reported final, remember it. The football-data.org list
// endpoint occasionally returns a stale snapshot that reverts a finished match
// to TIMED/IN_PLAY, which would otherwise flicker back to "delayed"/"live".
// This makes a completed game stick as final across refreshes.
const finalMatchIds = new Set<number>()

// Last known non-null scores per match. The same stale snapshots that revert a
// finished match's status also blank its scores (fullTime: {home:null,away:null}),
// which would render a final match as "FT · – –". Remembering the last good
// scores lets us keep showing them through a stale snapshot.
const lastKnownScores = new Map<number, { home: number; away: number }>()

function mapStatus(
  matchId: number,
  apiStatus: string,
  kickoffMs: number,
  hasScore: boolean,
): MatchStatus {
  // Sticky final: a game we've ever seen finished stays finished.
  if (apiStatus === "FINISHED" || apiStatus === "AWARDED") {
    finalMatchIds.add(matchId)
    return "final"
  }
  if (finalMatchIds.has(matchId)) return "final"

  const minsSinceKickoff = (Date.now() - kickoffMs) / 60_000
  switch (apiStatus) {
    case "IN_PLAY":
    case "LIVE":
    case "PAUSED":
      // The feed reports a playing status — trust it. (The free tier does not
      // populate the clock `minute`, so we can't use it to detect a delay; a
      // genuinely delayed kickoff is instead caught by verifyInPlayStatuses,
      // where the match-detail endpoint still reports TIMED, and by the
      // default branch below.)
      return "live"
    case "POSTPONED":
    case "SUSPENDED":
      return "delayed"
    default: {
      // SCHEDULED / TIMED: football-data.org has no "delayed" status and simply
      // leaves the match TIMED past kickoff. A recorded score means the match
      // has definitively been played, so never call it delayed/upcoming. Only
      // infer a delay when kickoff passed with no score yet.
      if (hasScore) return "live"
      return minsSinceKickoff > DELAY_THRESHOLD_MIN ? "delayed" : "upcoming"
    }
  }
}

function mapTeam(t: ApiTeam): Team | null {
  if (!t || !t.name) return null
  return {
    name: t.shortName || t.name,
    code: (t.tla || "").toLowerCase(),
    crestUrl: t.crest || undefined,
  }
}

function mapMatch(m: ApiMatch): Match {
  const kickoffMs = Date.parse(m.utcDate)

  // Resolve scores, preferring the current snapshot but falling back to the
  // last known good scores when a stale snapshot blanks them.
  let home = m.score.fullTime.home
  let away = m.score.fullTime.away
  if (home != null && away != null) {
    lastKnownScores.set(m.id, { home, away })
  } else {
    const cached = lastKnownScores.get(m.id)
    if (cached) {
      home = cached.home
      away = cached.away
    }
  }
  const hasScore = home != null && away != null

  return {
    id: String(m.id),
    roundId: STAGE_TO_ROUND[m.stage]?.id ?? m.stage.toLowerCase(),
    a: { team: mapTeam(m.homeTeam), score: home },
    b: { team: mapTeam(m.awayTeam), score: away },
    city: venueForMatch(m.id),
    kickoffISO: m.utcDate,
    kickoffOffsetMin: Math.round((kickoffMs - Date.now()) / 60_000),
    networks: networksForMatch(m.id),
    status: mapStatus(m.id, m.status, kickoffMs, hasScore),
  }
}

/**
 * Fetches the live knockout bracket from football-data.org and maps it onto
 * the app's Round/Match model. Group-stage and third-place matches are
 * excluded so the result is a clean 32→16→QF→SF→Final knockout tree.
 */
/**
 * Re-fetches the detail record for any match the list endpoint marks IN_PLAY /
 * PAUSED and overwrites the list status (and minute) with the authoritative
 * value. This catches delayed kickoffs the list endpoint still shows as live.
 */
// Cap how many detail calls a single refresh may make. This keeps the request
// count bounded even if the feed reports many (possibly delayed) in-play
// matches at once, so we never blow past the free-tier rate limit.
const MAX_DETAIL_VERIFICATIONS = 3

async function verifyInPlayStatuses(
  matches: ApiMatch[],
  apiKey: string,
): Promise<void> {
  const inPlay = matches
    .filter(
      (m) =>
        (m.status === "IN_PLAY" ||
          m.status === "LIVE" ||
          m.status === "PAUSED") &&
        // Skip games we already know are finished — a stale list snapshot may
        // still report them as in-play. This frees the verification budget for
        // genuinely live matches so their scores update faster.
        !finalMatchIds.has(m.id),
    )
    // Prioritize matches that look delayed (in-play but no clock minute) so
    // limited verification budget is spent where it matters most.
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
    .slice(0, MAX_DETAIL_VERIFICATIONS)
  await Promise.all(
    inPlay.map(async (m) => {
      try {
        const r = await fetch(`${API_BASE}/matches/${m.id}`, {
          headers: { "X-Auth-Token": apiKey },
          cache: "no-store",
        })
        if (!r.ok) return
        const detail: ApiMatch = await r.json()
        m.status = detail.status
        m.minute = detail.minute ?? null
      } catch {
        // Network hiccup: keep the list status rather than failing the bracket.
      }
    }),
  )
}

/**
 * Recover scores for finished matches whose list snapshot came back blank.
 * football-data.org's list endpoint occasionally returns a stale record that
 * reverts a completed match to null scores; the match-detail endpoint remains
 * authoritative, so we re-fetch it. This works even on a cold serverless
 * instance where the in-memory `lastKnownScores` cache is empty.
 */
async function recoverMissingScores(
  matches: ApiMatch[],
  apiKey: string,
): Promise<void> {
  const needsScore = matches
    .filter(
      (m) =>
        (m.status === "FINISHED" ||
          m.status === "AWARDED" ||
          finalMatchIds.has(m.id)) &&
        (m.score.fullTime.home == null || m.score.fullTime.away == null) &&
        // Only knockout matches surface in the bracket.
        STAGE_TO_ROUND[m.stage] != null,
    )
    .slice(0, MAX_DETAIL_VERIFICATIONS)

  await Promise.all(
    needsScore.map(async (m) => {
      try {
        const r = await fetch(`${API_BASE}/matches/${m.id}`, {
          headers: { "X-Auth-Token": apiKey },
          cache: "no-store",
        })
        if (!r.ok) return
        const detail: ApiMatch = await r.json()
        if (detail.score?.fullTime?.home != null) {
          m.score = detail.score
          m.status = detail.status
        }
      } catch {
        // Network hiccup: fall back to the in-memory score cache in mapMatch.
      }
    }),
  )
}

// --- Server-side cache -----------------------------------------------------
// football-data.org's free tier is rate limited (~10 requests/min). The client
// polls and each refresh makes up to a few upstream calls, so we cache the
// computed bracket and dedupe concurrent requests. If the upstream is rate
// limited (429), we serve the last good bracket instead of erroring.
//
// The TTL adapts to activity: a short window while matches are live/delayed so
// scores stay fresh, and a much longer window when nothing is happening to
// conserve the rate-limit budget.
const CACHE_TTL_LIVE_MS = 20_000
const CACHE_TTL_IDLE_MS = 240_000
let cachedBracket: Bracket | null = null
let cachedAt = 0
let inFlight: Promise<Bracket> | null = null

// How close to kickoff we start polling on the fast (live) cadence, so a match
// flipping from upcoming → live is detected promptly instead of being masked by
// the long idle TTL. Also covers kickoffs that have already passed but that the
// feed still reports as upcoming (a delayed start).
const IMMINENT_KICKOFF_MS = 5 * 60_000

/**
 * Whether the bracket should refresh on the short (live) cadence. True when a
 * match is already live/delayed, or when any upcoming match's kickoff is within
 * the imminent window or already past — the moment it goes live we want to catch
 * it quickly rather than serve the stale idle snapshot for the full idle TTL.
 */
function shouldPollFrequently(bracket: Bracket): boolean {
  if (bracket.hasLiveActivity) return true
  const now = Date.now()
  return bracket.rounds.some((r) =>
    r.matches.some(
      (m) =>
        m.status === "upcoming" &&
        Date.parse(m.kickoffISO) - now < IMMINENT_KICKOFF_MS,
    ),
  )
}

export async function getBracket(): Promise<Bracket> {
  const now = Date.now()
  const ttl =
    cachedBracket && shouldPollFrequently(cachedBracket)
      ? CACHE_TTL_LIVE_MS
      : CACHE_TTL_IDLE_MS
  if (cachedBracket && now - cachedAt < ttl) {
    return cachedBracket
  }
  // Single-flight: concurrent callers share one upstream fetch.
  if (inFlight) return inFlight

  inFlight = fetchBracketFresh()
    .then((bracket) => {
      cachedBracket = bracket
      cachedAt = Date.now()
      return bracket
    })
    .catch((err) => {
      // Serve stale data on rate limits / transient upstream errors.
      if (cachedBracket) {
        console.log("[v0] Serving cached bracket after error:", (err as Error).message)
        return cachedBracket
      }
      throw err
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

/**
 * Fetch the bracket, preferring the low-latency primary provider (API-Football)
 * and automatically falling back to football-data.org if it fails — missing
 * key, HTTP/quota error, or an empty knockout set. This keeps the bracket
 * working (just at higher latency) whenever the primary source is unavailable.
 */
async function fetchBracketFresh(): Promise<Bracket> {
  try {
    return await fetchApiFootballBracket()
  } catch (err) {
    console.log(
      "[v0] API-Football unavailable, falling back to football-data.org:",
      (err as Error).message,
    )
    return await fetchFromFootballData()
  }
}

async function fetchFromFootballData(): Promise<Bracket> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY is not set")
  }

  const res = await fetch(`${API_BASE}/competitions/${COMPETITION}/matches`, {
    headers: { "X-Auth-Token": apiKey },
    // Live scores: always fetch fresh, never use the Next.js data cache.
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(
      `football-data.org responded ${res.status} ${res.statusText}`,
    )
  }

  const data: { matches: ApiMatch[] } = await res.json()

  // The competition/list endpoint can report a stale IN_PLAY status for a match
  // whose kickoff was actually delayed. Re-verify any "in-play" match against
  // the authoritative match-detail endpoint (there is rarely more than one at a
  // time, so this stays well within the free-tier rate limit).
  await verifyInPlayStatuses(data.matches, apiKey)

  // A stale list snapshot can blank a finished match's scores; re-fetch the
  // authoritative detail record so completed games always show their result.
  await recoverMissingScores(data.matches, apiKey)

  // Fill in winners that the provider hasn't advanced into the next round yet.
  resolveAdvancement(data.matches)

  const buckets = new Map<string, Match[]>()
  for (const m of data.matches) {
    const stage = STAGE_TO_ROUND[m.stage]
    if (!stage) continue // skip GROUP_STAGE, THIRD_PLACE, etc.
    const list = buckets.get(stage.id) ?? []
    list.push(mapMatch(m))
    buckets.set(stage.id, list)
  }

  const rounds: Round[] = Object.values(STAGE_TO_ROUND)
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

  const hasLiveActivity = rounds.some((r) =>
    r.matches.some((m) => m.status === "live" || m.status === "delayed"),
  )

  return { rounds, updatedAt: new Date().toISOString(), hasLiveActivity }
}
