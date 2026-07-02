export type League = {
  id: string
  name: string
  inviteCode: string
  ownerId: string
  createdAt: string
}

export type LeagueMemberRow = {
  userId: string
  username: string
  avatarUrl: string | null
  joinedAt: string
}

/**
 * A single row in a league's standings. Points are a placeholder (0) until a
 * scoring system is built; members are ordered by join date for now.
 */
export type StandingEntry = {
  rank: number
  userId: string
  username: string
  points: number
  isYou: boolean
}

/** A league plus its ordered standings, ready for the leaderboard UI. */
export type LeagueWithStandings = League & {
  members: StandingEntry[]
}

/** Generate a human-friendly, unambiguous invite code, e.g. "FINALS-7K3Q". */
export function generateInviteCode(): string {
  // Omit easily-confused characters (0/O, 1/I/L).
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `FINALS-${code}`
}

/** Normalize any user-entered invite code for comparison/storage. */
export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase()
}
