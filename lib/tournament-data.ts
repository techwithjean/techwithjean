export type Team = {
  name: string
  code: string // ISO code for flagcdn fallback
  crestUrl?: string // preferred crest image from the live data source
}

export type MatchTeam = {
  team: Team | null
  score: number | null
}

export type MatchStatus = "upcoming" | "live" | "delayed" | "final"

export type Match = {
  id: string
  roundId: string
  a: MatchTeam
  b: MatchTeam
  city: string
  /** absolute kickoff instant as an ISO string (host time, US Eastern offset) */
  kickoffISO: string
  /** minutes from app load until kickoff. negative = already kicked off */
  kickoffOffsetMin: number
  networks: string[]
  status: MatchStatus
}

export type Round = {
  id: string
  name: string
  shortName: string
  matches: Match[]
}

const T: Record<string, Team> = {
  bra: { name: "Brazil", code: "br" },
  arg: { name: "Argentina", code: "ar" },
  fra: { name: "France", code: "fr" },
  eng: { name: "England", code: "gb-eng" },
  esp: { name: "Spain", code: "es" },
  ger: { name: "Germany", code: "de" },
  por: { name: "Portugal", code: "pt" },
  ned: { name: "Netherlands", code: "nl" },
  ita: { name: "Italy", code: "it" },
  bel: { name: "Belgium", code: "be" },
  cro: { name: "Croatia", code: "hr" },
  uru: { name: "Uruguay", code: "uy" },
  usa: { name: "USA", code: "us" },
  mex: { name: "Mexico", code: "mx" },
  jpn: { name: "Japan", code: "jp" },
  kor: { name: "South Korea", code: "kr" },
  sen: { name: "Senegal", code: "sn" },
  mar: { name: "Morocco", code: "ma" },
  sui: { name: "Switzerland", code: "ch" },
  den: { name: "Denmark", code: "dk" },
  col: { name: "Colombia", code: "co" },
  pol: { name: "Poland", code: "pl" },
  srb: { name: "Serbia", code: "rs" },
  gha: { name: "Ghana", code: "gh" },
  can: { name: "Canada", code: "ca" },
  aus: { name: "Australia", code: "au" },
  nga: { name: "Nigeria", code: "ng" },
  ecu: { name: "Ecuador", code: "ec" },
  swe: { name: "Sweden", code: "se" },
  nor: { name: "Norway", code: "no" },
  cmr: { name: "Cameroon", code: "cm" },
  civ: { name: "Ivory Coast", code: "ci" },
}

const CITIES = [
  "New York / NJ",
  "Los Angeles",
  "Dallas",
  "Mexico City",
  "Toronto",
  "Miami",
  "Atlanta",
  "Seattle",
  "Houston",
  "Kansas City",
  "Boston",
  "Philadelphia",
  "San Francisco",
  "Guadalajara",
  "Vancouver",
  "Monterrey",
]

const NETWORKS = ["FOX", "Telemundo", "TSN", "BBC"]

function mt(team: Team | null, score: number | null = null): MatchTeam {
  return { team, score }
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

/**
 * Build an absolute kickoff instant. Times are authored in the host time zone
 * (US Eastern, EDT = UTC-04:00 during the summer 2026 tournament). They are
 * stored as offset-aware ISO strings so each client can render them in the
 * viewer's own local time zone.
 */
function iso(month: number, day: number, hour: number, min = 0) {
  return `2026-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(min)}:00-04:00`
}

const r32Kickoffs = [
  iso(6, 28, 15),
  iso(6, 28, 18),
  iso(6, 28, 21),
  iso(6, 29, 12),
  iso(6, 29, 15),
  iso(6, 29, 18),
  iso(6, 29, 21),
  iso(6, 30, 12),
  iso(6, 30, 15),
  iso(6, 30, 18),
  iso(6, 30, 21),
  iso(7, 1, 12),
  iso(7, 1, 15),
  iso(7, 1, 18),
  iso(7, 1, 21),
  iso(7, 2, 12),
]

// --- Round of 32 (16 matches) ---
const r32Pairs: [Team, Team][] = [
  [T.bra, T.jpn],
  [T.fra, T.aus],
  [T.arg, T.nga],
  [T.esp, T.swe],
  [T.eng, T.ecu],
  [T.por, T.gha],
  [T.ned, T.civ],
  [T.ger, T.can],
  [T.ita, T.nor],
  [T.bel, T.cmr],
  [T.cro, T.usa],
  [T.uru, T.mex],
  [T.sen, T.kor],
  [T.mar, T.col],
  [T.sui, T.srb],
  [T.den, T.pol],
]

// Mix of statuses so the prediction card shows all states.
// match 0 -> locked (kicked off 42m ago), match 1 -> grace period (kicked off 2m ago),
// match 2 -> live, rest -> upcoming with staggered times.
const r32: Match[] = r32Pairs.map(([a, b], i) => {
  let status: MatchStatus = "upcoming"
  let kickoffOffsetMin = 60 * (i + 1)
  let aScore: number | null = null
  let bScore: number | null = null

  if (i === 0) {
    // Brazil vs Japan — live, Japan leading 1-0
    status = "live"
    kickoffOffsetMin = -34
    aScore = 0
    bScore = 1
  } else if (i === 1) {
    status = "live"
    kickoffOffsetMin = -34
    aScore = 2
    bScore = 0
  } else if (i === 2) {
    // grace period: kicked off 2 minutes ago (locks 5m after kickoff)
    status = "live"
    kickoffOffsetMin = -2
    aScore = 0
    bScore = 0
  } else if (i === 3) {
    // about to kick off
    kickoffOffsetMin = 18
  }

  return {
    id: `r32-${i}`,
    roundId: "r32",
    a: mt(a, aScore),
    b: mt(b, bScore),
    city: CITIES[i % CITIES.length],
    kickoffISO: r32Kickoffs[i],
    kickoffOffsetMin,
    networks: [NETWORKS[i % NETWORKS.length], NETWORKS[(i + 2) % NETWORKS.length]],
    status,
  }
})

function buildLaterRound(
  id: string,
  name: string,
  shortName: string,
  pairs: [Team | null, Team | null][],
  startOffsetDays: number,
): Round {
  const matches: Match[] = pairs.map(([a, b], i) => ({
    id: `${id}-${i}`,
    roundId: id,
    a: mt(a),
    b: mt(b),
    city: CITIES[(i + 3) % CITIES.length],
    kickoffISO: iso(7, startOffsetDays, 15 + (i % 3) * 3),
    kickoffOffsetMin: 60 * 24 * (startOffsetDays - 2),
    networks: [NETWORKS[i % NETWORKS.length], NETWORKS[(i + 1) % NETWORKS.length]],
    status: "upcoming" as MatchStatus,
  }))
  return { id, name, shortName, matches }
}

const r16 = buildLaterRound(
  "r16",
  "Round of 16",
  "R16",
  [
    [T.bra, T.fra],
    [T.arg, T.esp],
    [T.eng, T.por],
    [T.ned, T.ger],
    [T.ita, T.bel],
    [null, null],
    [null, null],
    [null, null],
  ],
  5,
)

const qf = buildLaterRound(
  "qf",
  "Quarter-finals",
  "QF",
  [
    [T.bra, T.arg],
    [T.eng, T.ned],
    [null, null],
    [null, null],
  ],
  9,
)

const sf = buildLaterRound(
  "sf",
  "Semi-finals",
  "SF",
  [
    [T.bra, null],
    [null, null],
  ],
  13,
)

const final = buildLaterRound("final", "Final", "Final", [[null, null]], 19)
final.matches[0].city = "New York / NJ"
final.matches[0].kickoffISO = iso(7, 19, 15)

export const rounds: Round[] = [
  { id: "r32", name: "Round of 32", shortName: "R32", matches: r32 },
  r16,
  qf,
  sf,
  final,
]

export type LeaderboardEntry = {
  rank: number
  username: string
  points: number
  avatarHue: number
  isYou?: boolean
}

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, username: "GoalMachine_Tay", points: 248, avatarHue: 250 },
  { rank: 2, username: " MidfieldMaestro", points: 235, avatarHue: 47 },
  { rank: 3, username: "Sofia_Strikes", points: 221, avatarHue: 350 },
  { rank: 4, username: "you", points: 214, avatarHue: 160, isYou: true },
  { rank: 5, username: "PitchPerfect_Dev", points: 202, avatarHue: 95 },
  { rank: 6, username: "Marcus_xG", points: 188, avatarHue: 290 },
  { rank: 7, username: "TikiTaka_Tom", points: 175, avatarHue: 20 },
  { rank: 8, username: "KeeperOfChaos", points: 161, avatarHue: 200 },
]

export const inviteCode = "FINALS-7K3Q"

export type Highlight = {
  id: string
  title: string
  description: string
  tag: "Highlight" | "Blooper" | "Goal of the Day"
  duration: string
  image: string
}

export const highlights: Highlight[] = [
  {
    id: "h1",
    title: "Japan Stuns Brazil with Early Strike",
    description: "Japan break the deadlock against Brazil to lead 1-0 in New York / NJ.",
    tag: "Goal of the Day",
    duration: "0:48",
    image: "/highlights/screamer.png",
  },
  {
    id: "h2",
    title: "Keeper Trips Over the Ball",
    description: "A goalkeeping howler you have to see to believe.",
    tag: "Blooper",
    duration: "0:22",
    image: "/highlights/keeper-blooper.png",
  },
  {
    id: "h3",
    title: "France's Counter-Attack Masterclass",
    description: "Three passes, end to end, finished with ice in the veins.",
    tag: "Highlight",
    duration: "1:05",
    image: "/highlights/counter-attack.png",
  },
  {
    id: "h4",
    title: "Mascot Faceplants on the Pitch",
    description: "The tournament mascot steals the show for all the wrong reasons.",
    tag: "Blooper",
    duration: "0:18",
    image: "/highlights/mascot-blooper.png",
  },
]

export const favoriteTeams = Object.values(T).sort((a, b) =>
  a.name.localeCompare(b.name),
)
