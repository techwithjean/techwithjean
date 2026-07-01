"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { MatchCard } from "@/components/match-card"
import type { Match, Round } from "@/lib/tournament-data"

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

  const activeMatches =
    rounds.find((r) => r.id === activeRound)?.matches ??
    rounds[0]?.matches ??
    []

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
            onClick={() => onSelectMatch(m)}
          />
        ))}
      </div>

      {/* Desktop: node-based columns */}
      <div className="hidden gap-4 overflow-x-auto pb-2 lg:flex">
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
              {round.matches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  selected={selectedId === m.id}
                  predicted={predictedIds.has(m.id)}
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
