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
 * Calendar-day bucket for a match's kickoff, in the viewer's LOCAL timezone.
 * Using local (not UTC) days is essential: a game played at ~8pm local
 * yesterday can fall on a different UTC date than a game kicking off ~8pm local
 * today, which would otherwise mis-bucket "yesterday" and "today".
 */
function dayKey(m: Match) {
  const d = new Date(m.kickoffISO)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Today's calendar-day bucket, using the same local basis as dayKey. */
function todayKey() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

/**
 * A match is "played" once it has finished (FT). Finished games from a past
 * day drop to the very bottom of the list.
 */
function isPlayed(m: Match) {
  return m.status === "final"
}

/** A game currently in progress (or delayed but under way). */
function isLiveNow(m: Match) {
  return m.status === "live" || m.status === "delayed"
}

/**
 * Top-level group. Lower value sorts first:
 *   0 → live games (in progress) — always first, regardless of calendar day
 *   1 → today's games that are not live yet
 *   2 → future dates that have not been played yet
 *   3 → already-played (FT) games (past days, or lingering past-day games)
 */
function groupTier(m: Match, today: number) {
  // Live games float to the very top even if they started on a prior day
  // (e.g. a delayed or late-running fixture that crossed midnight).
  if (isLiveNow(m)) return 0
  const day = dayKey(m)
  if (day === today) return 1 // today (upcoming or finished-today)
  if (isPlayed(m)) return 3 // already played (FT)
  if (day < today) return 3 // any lingering past-day game also sinks to bottom
  return 2 // future, not yet played
}

/**
 * Ordering within today's (non-live) bucket. Upcoming games sit above
 * finished (FT) games, so games played earlier today drop to the end of the
 * day.
 */
function todayStatusTier(m: Match) {
  if (m.status === "upcoming") return 0
  return 1 // final (FT) played earlier today
}

/**
 * Order matches top-to-bottom:
 *   1. the favorite team's match floats to the very top.
 *   2. live games next (in progress), earliest kickoff first.
 *   3. today's remaining games ascending, with FT (today) at the end of the day.
 *   4. then all other future dates that haven't been played, earliest first.
 *   5. finally, already-played (FT) games, most recent day/kickoff first.
 */
function orderMatches(matches: Match[], favorite: string | null) {
  const today = todayKey()
  return matches
    .map((m, i) => ({ m, i }))
    .sort((a, b) => {
      // 1. Favorite team's match always floats to the top.
      const aFav = matchHasFavorite(a.m, favorite)
      const bFav = matchHasFavorite(b.m, favorite)
      if (aFav !== bFav) return aFav ? -1 : 1

      // 2. Top-level grouping: live → today → future → past-played.
      const tierA = groupTier(a.m, today)
      const tierB = groupTier(b.m, today)
      if (tierA !== tierB) return tierA - tierB

      // 3. Live bucket: earliest kickoff first.
      if (tierA === 0) {
        const diff = Date.parse(a.m.kickoffISO) - Date.parse(b.m.kickoffISO)
        if (diff !== 0) return diff
        return a.i - b.i
      }

      // 4. Today's bucket: upcoming ahead of FT, then by kickoff ascending.
      if (tierA === 1) {
        const statusDiff = todayStatusTier(a.m) - todayStatusTier(b.m)
        if (statusDiff !== 0) return statusDiff
        const diff = Date.parse(a.m.kickoffISO) - Date.parse(b.m.kickoffISO)
        if (diff !== 0) return diff
        return a.i - b.i
      }

      // 5. Past-played bucket: most recent day first, latest kickoff first.
      if (tierA === 3) {
        const dayDiff = dayKey(b.m) - dayKey(a.m)
        if (dayDiff !== 0) return dayDiff
        const diff = Date.parse(b.m.kickoffISO) - Date.parse(a.m.kickoffISO)
        if (diff !== 0) return diff
        return a.i - b.i
      }

      // 6. Future bucket: earliest day/kickoff first.
      const dayDiff = dayKey(a.m) - dayKey(b.m)
      if (dayDiff !== 0) return dayDiff
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
  correctIds,
  isLive,
  isDelayed,
}: {
  rounds: Round[]
  selectedId: string | null
  onSelectMatch: (m: Match) => void
  predictedIds: Set<string>
  correctIds: Set<string>
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
            correct={correctIds.has(m.id)}
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
                  correct={correctIds.has(m.id)}
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
