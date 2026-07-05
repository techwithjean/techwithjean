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

/** Calendar-day bucket (UTC midnight ms) for a match's kickoff. */
function dayKey(m: Match) {
  const d = new Date(m.kickoffISO)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Today's calendar-day bucket, using the same UTC basis as dayKey. */
function todayKey() {
  const now = new Date()
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

/**
 * A match is "played" once it has finished (FT). Finished games from a past
 * day drop to the very bottom of the list.
 */
function isPlayed(m: Match) {
  return m.status === "final"
}

/**
 * Top-level group. Lower value sorts first:
 *   1 → today's games (not yet in the past-played bucket)
 *   2 → future dates that have not been played yet
 *   3 → already-played (FT) games from earlier days
 */
function groupTier(m: Match, today: number) {
  const day = dayKey(m)
  // Finished games from an earlier day are "already played" → bottom bucket.
  if (isPlayed(m) && day < today) return 3
  if (day < today) return 3 // any lingering past-day game also sinks to bottom
  if (day === today) return 1 // today
  return 2 // future
}

/**
 * Ordering within today's bucket. Live (and delayed-live) games sit above
 * upcoming ones, and finished (FT) games for today sit last.
 */
function todayStatusTier(m: Match) {
  if (m.status === "live" || m.status === "delayed") return 0
  if (m.status === "upcoming") return 1
  return 2 // final (FT) played earlier today
}

/**
 * Order matches top-to-bottom:
 *   1. the favorite team's match floats to the very top.
 *   2. today's games first — live ahead of upcoming, with FT (today) last.
 *   3. then all other future dates that haven't been played, earliest first.
 *   4. finally, already-played (FT) games from past days, most recent first.
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

      // 2. Top-level grouping: today → future → past-played.
      const tierA = groupTier(a.m, today)
      const tierB = groupTier(b.m, today)
      if (tierA !== tierB) return tierA - tierB

      // 3. Past-played bucket: most recent day first, latest kickoff first.
      if (tierA === 3) {
        const dayDiff = dayKey(b.m) - dayKey(a.m)
        if (dayDiff !== 0) return dayDiff
        const diff = Date.parse(b.m.kickoffISO) - Date.parse(a.m.kickoffISO)
        if (diff !== 0) return diff
        return a.i - b.i
      }

      // 4. Today's bucket: live ahead of upcoming, FT last, then by kickoff.
      if (tierA === 1) {
        const statusDiff = todayStatusTier(a.m) - todayStatusTier(b.m)
        if (statusDiff !== 0) return statusDiff
        const diff = Date.parse(a.m.kickoffISO) - Date.parse(b.m.kickoffISO)
        if (diff !== 0) return diff
        return a.i - b.i
      }

      // 5. Future bucket: earliest day/kickoff first.
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
