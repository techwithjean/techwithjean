"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Flag } from "@/components/flag"
import {
  LockIcon,
  MapPinIcon,
  CheckCircle2Icon,
  MinusIcon,
  PlusIcon,
  LogInIcon,
  Loader2Icon,
  AlertCircleIcon,
} from "lucide-react"
import type { Match } from "@/lib/tournament-data"
import { useKickoffTime } from "@/lib/use-kickoff-time"
import { savePrediction } from "@/app/actions/predictions"

type SavedPrediction = { a: number; b: number }

const GRACE_MS = 5 * 60 * 1000

type Phase = "upcoming" | "grace" | "locked"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function ScoreStepper({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="max-w-24 truncate text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={disabled || value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Decrease ${label} score`}
        >
          <MinusIcon className="size-4" />
        </Button>
        <span className="w-10 text-center font-heading text-3xl font-bold tabular-nums">
          {value}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={disabled || value >= 20}
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label} score`}
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function PredictionCard({
  match,
  baseTime,
  open,
  onOpenChange,
  isAuthed,
  savedPrediction,
  onSaved,
}: {
  match: Match | null
  baseTime: number
  open: boolean
  onOpenChange: (o: boolean) => void
  isAuthed: boolean
  savedPrediction: SavedPrediction | null
  onSaved: (matchId: string, a: number, b: number) => void
}) {
  const [now, setNow] = useState<number | null>(null)
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // reset / hydrate when a new match is opened
  useEffect(() => {
    setScoreA(savedPrediction?.a ?? 0)
    setScoreB(savedPrediction?.b ?? 0)
    setSubmitted(!!savedPrediction)
    setError(null)
  }, [match?.id, savedPrediction])

  useEffect(() => {
    if (!open) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [open])

  const target = match ? baseTime + match.kickoffOffsetMin * 60_000 : 0

  const { phase, msLeft } = useMemo(() => {
    if (now === null || !match)
      return { phase: "upcoming" as Phase, msLeft: 0 }
    const diff = target - now
    if (diff > 0) return { phase: "upcoming" as Phase, msLeft: diff }
    if (now < target + GRACE_MS)
      return { phase: "grace" as Phase, msLeft: target + GRACE_MS - now }
    return { phase: "locked" as Phase, msLeft: 0 }
  }, [now, target, match])

  // Called unconditionally (rules of hooks); falls back to a placeholder
  // instant when no match is selected.
  const kickoff = useKickoffTime(
    match?.kickoffISO ?? "2026-01-01T00:00:00-04:00",
  )

  if (!match) return null

  const bothTeams = match.a.team && match.b.team
  const totalSec = Math.max(0, Math.floor(msLeft / 1000))
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  const disabled =
    phase === "locked" || submitted || !bothTeams || isPending || !isAuthed

  function handleSubmit() {
    if (!match) return
    setError(null)
    const matchId = match.id
    startTransition(async () => {
      const res = await savePrediction(matchId, scoreA, scoreB)
      if (res.ok) {
        setSubmitted(true)
        onSaved(matchId, res.a, res.b)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-base">
            {match.roundId === "final"
              ? "The Final"
              : "Match Prediction"}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            <MapPinIcon className="size-3.5" />
            {match.city ? `${match.city} · ` : ""}
            {kickoff.date} · {kickoff.time} {kickoff.zone}
          </DialogDescription>
        </DialogHeader>

        {/* Countdown banner */}
        {phase === "upcoming" && (
          <div className="rounded-lg border border-border bg-secondary/60 p-3 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Kicks off in
            </p>
            <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-foreground">
              {now === null
                ? "––:––:––"
                : days > 0
                  ? `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`
                  : `${pad(hours)}:${pad(mins)}:${pad(secs)}`}
            </p>
          </div>
        )}

        {phase === "grace" && (
          <div className="animate-pulse rounded-lg border border-accent/60 bg-accent/15 p-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
              Closing now — match underway
            </p>
            <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-accent">
              Locking in {pad(mins)}:{pad(secs)}
            </p>
          </div>
        )}

        {phase === "locked" && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/60 p-3 text-center">
            <LockIcon className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              Predictions are locked for this match
            </p>
          </div>
        )}

        {/* Score inputs */}
        <div className="flex items-center justify-center gap-4 py-2">
          <div className="flex flex-col items-center gap-2">
            <Flag team={match.a.team} className="h-8 w-12" />
            <ScoreStepper
              label={match.a.team?.name ?? "TBD"}
              value={scoreA}
              onChange={setScoreA}
              disabled={disabled}
            />
          </div>
          <span className="font-heading text-xl font-bold text-muted-foreground">
            vs
          </span>
          <div className="flex flex-col items-center gap-2">
            <Flag team={match.b.team} className="h-8 w-12" />
            <ScoreStepper
              label={match.b.team?.name ?? "TBD"}
              value={scoreB}
              onChange={setScoreB}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircleIcon className="size-4 shrink-0" />
            {error}
          </p>
        )}

        {/* Action */}
        {!bothTeams ? (
          <Button disabled className="w-full">
            Teams to be confirmed
          </Button>
        ) : !isAuthed ? (
          <Button
            render={<a href="/auth/login" />}
            nativeButton={false}
            className="w-full bg-gradient-to-r from-brand-red to-brand-orange text-white hover:opacity-90"
          >
            <LogInIcon className="size-4" />
            Sign in to predict
          </Button>
        ) : submitted ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2 rounded-md bg-primary/15 py-2 text-sm font-medium text-primary">
              <CheckCircle2Icon className="size-4" />
              Prediction saved: {scoreA} – {scoreB}
            </div>
            {phase === "locked" ? (
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <LockIcon className="size-3.5" />
                This match is locked — your pick is final.
              </p>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSubmitted(false)}
              >
                Edit prediction
              </Button>
            )}
          </div>
        ) : phase === "locked" ? (
          <Button disabled className="w-full">
            <LockIcon className="size-4" />
            Locked
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className={cn(
              "w-full",
              phase === "grace" &&
                "bg-accent text-accent-foreground hover:bg-accent/90",
            )}
          >
            {isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Saving…
              </>
            ) : phase === "grace" ? (
              "Submit before lock!"
            ) : savedPrediction ? (
              "Update Prediction"
            ) : (
              "Submit Prediction"
            )}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
