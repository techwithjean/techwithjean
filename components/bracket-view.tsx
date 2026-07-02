"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { MatchCard } from "@/components/match-card"
import { useFavoriteTeam } from "@/components/favorite-team-context"
import type { Match, Round } from "@/lib/tournament-data"

/** True when the favorite team is playing in this match. */
function matchHasFavorite(m: Match, favorite: string | null) {
  if (!favorite) return false
  return m.a.team?.name === favorite || m.b.team?.name === favorite
}

/**
 * Priority tier for top-to-bottom ordering (lower sorts first):
 *   0 — the favorite team's match (when one is selected)
 *   1 — live matches
 *   2 — everything else
 */
function orderTier(m: Match, favorite: string | null) {
  if (matchHasFavorite(m, favorite)) return 0
  if (m.status === "live") return 1
  return 2
}

/** A match that hasn't been played yet (scheduled or delayed kickoff). */
function isNotYetPlayed(m: Match) {
  return m.status === "upcoming" || m.status === "delayed"
}

/**
 * Order matches top-to-bottom:
 *   1. favorite team's match (if selected)
 *   2. live matches, by whichever kicked off first
 *   3. the rest — not-yet-played matches ordered by soonest kickoff date,
 *      then finished matches ordered by most recently played first.
 */
function orderMatches(matches: Match[], favorite: string | null) {
  return matches
    .map((m, i) => ({ m, i }))
    .sort((a, b) => {
      const ta = orderTier(a.m, favorite)
      const tb = orderTier(b.m, favorite)
      if (ta !== tb) return ta - tb
      // Within the live tier, earliest kickoff (started first) comes first.
      if (ta === 1) {
        const diff = Date.parse(a.m.kickoffISO) - Date.parse(b.m.kickoffISO)
        if (diff !== 0) return diff
      }
      // Within the "rest" tier, upcoming matches sort ahead of finished ones,
      // ordered by soonest kickoff date.
      if (ta === 2) {
        const aPending = isNotYetPlayed(a.m)
        const bPending = isNotYetPlayed(b.m)
        if (aPending !== bPending) return aPending ? -1 : 1
        if (aPending && bPending) {
          // Upcoming: soonest kickoff first.
          const diff = Date.parse(a.m.kickoffISO) - Date.parse(b.m.kickoffISO)
          if (diff !== 0) return diff
        } else {
          // Finished: most recently played first.
          const diff = Date.parse(b.m.kickoffISO) - Date.parse(a.m.kickoffISO)
          if (diff !== 0) return diff
        }
      }
      // Stable fallback: preserve the original bracket order.
      return a.i - b.i
    })
    .map((x) => x.m)
}

export function BracketView({
  rounds,
  selectedId,
  onSelectMatch,
  predictedIds,
  isLive,
  isDelayed,
}: {
  rounds: Round[]
  selectedId: string | null
  onSelectMatch: (m: Match) => void
  predictedIds: Set<string>
  isLive?: boolean
  isDelayed?: boolean
}) {
  const [activeRound, setActiveRound] = useState(rounds[0]?.id ?? "")
  const { favorite } = useFavoriteTeam()

  const activeMatches = orderMatches(
    rounds.find((r) => r.id === activeRound)?.matches ??
      rounds[0]?.matches ??
      [],
    favorite,
  )

  return (
    <section className="relative rounded-2xl bg-card/40 p-4 ring-1 ring-border sm:p-6">
      {/* Live / delayed indicator — top right of the bracket */}
      {(isLive || isDelayed) && (
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          {isLive ? (
            <span className="flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
              <span className="size-1.5 animate-pulse rounded-full bg-accent" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-destructive">
              <span className="size-1.5 animate-pulse rounded-full bg-destructive" />
              Live · Delayed
            </span>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold sm:text-xl">
            Knockout Bracket
          </h2>
          <p className="text-sm text-muted-foreground">
            Real 2026 Finals Cup scores · tap any match to predict.
          </p>
        </div>

        {/* Round selector (mobile-first segmented control) */}
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-secondary p-1 lg:hidden">
          {rounds.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveRound(r.id)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                activeRound === r.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.shortName}
            </button>
          ))}
        </div>
      </div>

      {rounds.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Live bracket data is currently unavailable. Scores will appear here
          once the feed is reachable.
        </div>
      )}

      {/* Mobile: single round, single column */}
      <div className="flex flex-col gap-3 lg:hidden">
        {activeMatches.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            selected={selectedId === m.id}
            predicted={predictedIds.has(m.id)}
            isFavorite={matchHasFavorite(m, favorite)}
            onClick={() => onSelectMatch(m)}
          />
        ))}
      </div>

      {/* Desktop: node-based columns.
          `overflow-x-auto` also forces overflow-y to auto, which would clip the
          box-shadow `ring` on cards at the container edges. The `p-1` gives the
          2px ring room to render so every selected/favorite card highlights
          consistently; `-m-1` keeps the outer layout aligned. */}
      <div className="-m-1 hidden gap-4 overflow-x-auto p-1 pb-2 lg:flex">
        {rounds.map((round) => (
          <div
            key={round.id}
            className="flex min-w-[240px] flex-1 flex-col"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {round.name}
              </h3>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {round.matches.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {orderMatches(round.matches, favorite).map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  selected={selectedId === m.id}
                  predicted={predictedIds.has(m.id)}
                  isFavorite={matchHasFavorite(m, favorite)}
                  onClick={() => onSelectMatch(m)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
