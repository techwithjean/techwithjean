"use client"

import { cn } from "@/lib/utils"
import {
  MapPinIcon,
  ClockIcon,
  RadioIcon,
  CheckCircle2Icon,
  HeartIcon,
} from "lucide-react"
import { Flag } from "@/components/flag"
import type { Match, MatchTeam } from "@/lib/tournament-data"
import { useKickoffTime } from "@/lib/use-kickoff-time"
import { useFavoriteTeam } from "@/components/favorite-team-context"

function TeamRow({
  side,
  state,
  favorite,
}: {
  side: MatchTeam
  state: "win" | "lose" | "neutral"
  favorite?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-1.5",
        state === "lose" ? "text-muted-foreground" : "text-foreground",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Flag team={side.team} className="h-4 w-6" />
        <span
          className={cn(
            "truncate text-sm",
            state === "win" ? "font-semibold" : "font-medium",
          )}
        >
          {side.team ? side.team.name : "TBD"}
        </span>
        {favorite && (
          <HeartIcon
            className="size-3 shrink-0 fill-brand-green text-brand-green"
            aria-label="Your favorite team"
          />
        )}
      </div>
      <span
        className={cn(
          "min-w-5 text-right text-sm font-semibold tabular-nums",
          state === "win" && "text-accent",
        )}
      >
        {side.score ?? "–"}
      </span>
    </div>
  )
}

export function MatchCard({
  match,
  selected,
  predicted,
  correct,
  isFavorite,
  onClick,
}: {
  match: Match
  selected: boolean
  predicted?: boolean
  correct?: boolean
  isFavorite?: boolean
  onClick: () => void
}) {
  const { favorite } = useFavoriteTeam()
  const aFavorite = !!favorite && match.a.team?.name === favorite
  const bFavorite = !!favorite && match.b.team?.name === favorite

  const aWins =
    match.status === "final" &&
    match.a.score !== null &&
    match.b.score !== null &&
    match.a.score > match.b.score
  const bWins =
    match.status === "final" &&
    match.a.score !== null &&
    match.b.score !== null &&
    match.b.score > match.a.score

  const kickoff = useKickoffTime(match.kickoffISO)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full overflow-hidden rounded-xl bg-card text-left ring-1 transition-all hover:ring-primary/60",
        selected
          ? "ring-2 ring-primary"
          : correct
            ? "ring-2 ring-primary"
            : isFavorite
              ? "ring-2 ring-brand-green/60"
              : match.status === "live"
                ? "ring-accent/50"
                : match.status === "delayed"
                  ? "ring-destructive/50"
                  : "ring-border",
      )}
    >
      {/* status strip */}
      <div className="flex items-center justify-between border-b border-border/70 px-3 py-1.5">
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <ClockIcon className="size-3" />
          {kickoff.date} · {kickoff.time}{" "}
          <span className="text-muted-foreground/70">{kickoff.zone}</span>
        </span>
        <span className="flex items-center gap-2">
          {predicted && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
              <CheckCircle2Icon className="size-3" />
              Predicted
            </span>
          )}
          {match.status === "live" ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-accent">
              <span className="size-1.5 animate-pulse rounded-full bg-accent" />
              LIVE
            </span>
          ) : match.status === "delayed" ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-destructive">
              <span className="size-1.5 animate-pulse rounded-full bg-destructive" />
              LIVE · DELAYED
            </span>
          ) : match.status === "final" ? (
            <span className="text-[11px] font-semibold text-muted-foreground">
              FT
            </span>
          ) : (
            !predicted && (
              <span className="text-[11px] font-semibold text-brand-orange">
                Predict
              </span>
            )
          )}
        </span>
      </div>

      <div className="divide-y divide-border/60">
        <TeamRow
          side={match.a}
          state={aWins ? "win" : bWins ? "lose" : "neutral"}
          favorite={aFavorite}
        />
        <TeamRow
          side={match.b}
          state={bWins ? "win" : aWins ? "lose" : "neutral"}
          favorite={bFavorite}
        />
      </div>

      {(match.city || match.networks.length > 0) && (
        <div className="flex items-center justify-between gap-2 border-t border-border/70 px-3 py-1.5">
          {match.city ? (
            <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
              <MapPinIcon className="size-3 shrink-0" />
              <span className="truncate">{match.city}</span>
            </span>
          ) : (
            <span />
          )}
          {match.networks.length > 0 && (
            <span className="flex shrink-0 items-center gap-1">
              <RadioIcon className="size-3 text-muted-foreground" />
              {match.networks.map((n) => (
                <span
                  key={n}
                  className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground"
                >
                  {n}
                </span>
              ))}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
