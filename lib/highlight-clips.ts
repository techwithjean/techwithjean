export type ClipCategory =
  | "Goal of the Day"
  | "Upset"
  | "Best Moments"
  | "Featured"

export type HighlightClip = {
  // YouTube-hosted clips use `youtubeId`; self-hosted clips use `videoSrc`.
  youtubeId?: string
  /** Self-hosted MP4 (served from /public). Takes precedence over youtubeId. */
  videoSrc?: string
  /** Poster image for self-hosted clips (YouTube clips derive it from the id). */
  poster?: string
  category: ClipCategory
  title: string
  meta: string
}

/**
 * Curated official 2026 FIFA World Cup clips used as a fallback when the live
 * YouTube feed can't be reached. The primary source is the auto-updating feed
 * served by /api/highlights.
 */
export const curatedClips: HighlightClip[] = [
  {
    videoSrc: "/videos/myfinalscup-intro.mp4",
    poster: "/videos/myfinalscup-intro-poster.png",
    category: "Featured",
    title: "Welcome to myfinalscup",
    meta: "Your 2026 Finals Cup knockout hub",
  },
  {
    youtubeId: "ut3NaRL855g",
    category: "Upset",
    title: "Switzerland vs Colombia",
    meta: "Round of 16 · Official highlights",
  },
  {
    youtubeId: "QgUSOlN0Tt0",
    category: "Goal of the Day",
    title: "Brazil vs Japan",
    meta: "Round of 32 · Official highlights",
  },
  {
    youtubeId: "II84TKpzJY4",
    category: "Upset",
    title: "France vs Sweden",
    meta: "Round of 32 · Official highlights",
  },
  {
    youtubeId: "rPebJKCPjK0",
    category: "Upset",
    title: "Ivory Coast vs Norway",
    meta: "Round of 32 · Official highlights",
  },
  {
    youtubeId: "m4x9IwGx3yU",
    category: "Best Moments",
    title: "Best Moments — Matchday Three",
    meta: "Group stage · Official recap",
  },
]

/** Infer a display category from a video title. */
export function categorizeClip(title: string): ClipCategory {
  const t = title.toLowerCase()
  if (
    /\b(upset|shock|stun|eliminat|knocked out|sends|moves on|advance|golden goal|penalt)/.test(
      t,
    )
  ) {
    return "Upset"
  }
  if (/\b(goal|golazo|brace|hat.?trick|scores?|stunner|winner|strike|free.?kick)/.test(t)) {
    return "Goal of the Day"
  }
  return "Best Moments"
}
