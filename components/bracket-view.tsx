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

/** Calendar-day bucket (YYYY-MM-DD) for a match's kickoff. */
function dayKey(m: Match) {
  const d = new Date(m.kickoffISO)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/**
 * Within a single day, live matches sort above everything else (including
 * games already played that day). Lower value sorts first.
 */
function sameDayTier(m: Match) {
  return m.status === "live" ? 0 : 1
}

/**
 * Order matches top-to-bottom:
 *   1. the favorite team's match (only when a favorite is selected AND it's in
 *      this bracket/round).
 *   2. by calendar day, earliest → latest. Finished (FT) matches keep their
 *      day slot — they are NOT pushed to the bottom.
 *   3. within the same day, live matches sort above already-played ones; if
 *      both are live, the earlier kickoff goes first.
 */
function orderMatches(matches: Match[], favorite: string | null) {
  return matches
    .map((m, i) => ({ m, i }))
    .sort((a, b) => {
      // Favorite team's match always floats to the top.
      const aFav = matchHasFavorite(a.m, favorite)
      const bFav = matchHasFavorite(b.m, favorite)
      if (aFav !== bFav) return aFav ? -1 : 1

      // Chronological by calendar day, soonest first.
      const dayDiff = dayKey(a.m) - dayKey(b.m)
      if (dayDiff !== 0) return dayDiff

      // Same day: live matches rise above already-played ones.
      const tierDiff = sameDayTier(a.m) - sameDayTier(b.m)
      if (tierDiff !== 0) return tierDiff

      // Same day and same tier (e.g. both live): earlier kickoff first.
      const diff = Date.parse(a.m.kickoffISO) - Date.parse(b.m.kickoffISO)
      if (diff !== 0) return diff

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
