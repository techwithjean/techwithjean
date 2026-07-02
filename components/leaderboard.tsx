"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CopyIcon,
  CheckIcon,
  CrownIcon,
  UsersIcon,
  TrophyIcon,
  PlusIcon,
} from "lucide-react"
import { createLeague, joinLeagueByCode } from "@/app/actions/leagues"
import type { LeagueWithStandings } from "@/lib/leagues"

/** Deterministic avatar hue from a string so colors are stable per user. */
function hueFor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return h
}

export function Leaderboard({
  leagues,
  isAuthed,
}: {
  leagues: LeagueWithStandings[]
  isAuthed: boolean
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(
    leagues[0]?.id ?? null,
  )
  const [copied, setCopied] = useState(false)

  const selected =
    leagues.find((l) => l.id === selectedId) ?? leagues[0] ?? null

  function copyCode(code: string) {
    navigator.clipboard
      ?.writeText(`https://myfinalscup.com/join/${code}`)
      .catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Signed-out or no leagues yet → prompt to create/join.
  if (!selected) {
    return (
      <LeagueEmptyState
        isAuthed={isAuthed}
        onChanged={() => router.refresh()}
      />
    )
  }

  return (
    <section className="flex flex-col rounded-2xl bg-card p-4 ring-1 ring-border sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <UsersIcon className="size-4" />
          </span>
          <div className="min-w-0">
            {leagues.length > 1 ? (
              <Select
                value={selected.id}
                onValueChange={(v) => v && setSelectedId(v)}
              >
                <SelectTrigger className="h-auto border-0 p-0 font-heading text-base font-bold shadow-none focus-visible:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <h2 className="truncate font-heading text-base font-bold leading-tight">
                {selected.name}
              </h2>
            )}
            <p className="text-xs text-muted-foreground">
              {selected.members.length}{" "}
              {selected.members.length === 1 ? "member" : "members"} · Private
            </p>
          </div>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-1">
        {selected.members.map((entry) => (
          <li
            key={entry.userId}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2",
              entry.isYou
                ? "bg-primary/10 ring-1 ring-primary/30"
                : "hover:bg-secondary/60",
            )}
          >
            <span
              className={cn(
                "w-5 text-center text-sm font-bold tabular-nums",
                entry.rank === 1
                  ? "text-brand-yellow"
                  : "text-muted-foreground",
              )}
            >
              {entry.rank === 1 ? (
                <CrownIcon className="mx-auto size-4" />
              ) : (
                entry.rank
              )}
            </span>
            <Avatar className="size-8 ring-1 ring-border">
              <AvatarFallback
                style={{
                  backgroundColor: `oklch(0.4 0.12 ${hueFor(entry.username)})`,
                  color: "white",
                }}
                className="text-xs font-semibold"
              >
                {entry.username.trim().slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {entry.username.trim()}
              {entry.isYou && (
                <span className="ml-1 text-xs text-primary">(you)</span>
              )}
            </span>
            <span className="text-sm font-bold tabular-nums">
              {entry.points}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                pts
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/40 p-3">
        <p className="text-xs text-muted-foreground">Invite code</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 rounded-md bg-background px-2.5 py-1.5 font-mono text-sm font-semibold text-foreground ring-1 ring-border">
            {selected.inviteCode}
          </code>
          <Button
            size="sm"
            onClick={() => copyCode(selected.inviteCode)}
            aria-live="polite"
          >
            {copied ? (
              <>
                <CheckIcon className="size-4" />
                Copied
              </>
            ) : (
              <>
                <CopyIcon className="size-4" />
                Copy Invite Code
              </>
            )}
          </Button>
        </div>
      </div>

      {isAuthed && (
        <div className="mt-3">
          <LeagueEmptyState
            compact
            isAuthed={isAuthed}
            onChanged={() => router.refresh()}
          />
        </div>
      )}
    </section>
  )
}

/**
 * Inline create/join controls. Shown as the full card when the user has no
 * leagues, or as a compact "add another league" toggle beneath an existing one.
 */
function LeagueEmptyState({
  isAuthed,
  compact = false,
  onChanged,
}: {
  isAuthed: boolean
  compact?: boolean
  onChanged: () => void
}) {
  const [mode, setMode] = useState<"none" | "create" | "join">(
    compact ? "none" : "create",
  )
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError(null)
    const res =
      mode === "create"
        ? await createLeague(name)
        : await joinLeagueByCode(code)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setName("")
    setCode("")
    setMode(compact ? "none" : "create")
    onChanged()
  }

  if (!isAuthed) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 text-center ring-1 ring-border">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <TrophyIcon className="size-5" />
        </span>
        <div>
          <h2 className="font-heading text-base font-bold">
            Join a private league
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to create a league or join friends with an invite code.
          </p>
        </div>
        <Button className="w-full" render={<a href="/auth/login" />}>
          Sign in
        </Button>
      </section>
    )
  }

  if (compact && mode === "none") {
    return (
      <button
        type="button"
        onClick={() => setMode("create")}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:bg-secondary/60"
      >
        <PlusIcon className="size-3.5" />
        Create or join another league
      </button>
    )
  }

  return (
    <section
      className={cn(
        !compact &&
          "flex flex-col gap-4 rounded-2xl bg-card p-5 ring-1 ring-border",
      )}
    >
      {!compact && (
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <TrophyIcon className="size-4" />
          </span>
          <div>
            <h2 className="font-heading text-base font-bold leading-tight">
              Your leagues
            </h2>
            <p className="text-xs text-muted-foreground">
              Create one or join friends with a code.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={cn(
            "rounded-lg border py-2 text-xs font-medium transition-colors",
            mode === "create"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:bg-secondary",
          )}
        >
          Create
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={cn(
            "rounded-lg border py-2 text-xs font-medium transition-colors",
            mode === "join"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:bg-secondary",
          )}
        >
          Join
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-2"
      >
        {mode === "create" ? (
          <Input
            placeholder="League name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
        ) : (
          <Input
            placeholder="FINALS-7K3Q"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono uppercase"
          />
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          {compact && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode("none")}
              disabled={busy}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            className="flex-1"
            disabled={
              busy ||
              (mode === "create" ? !name.trim() : !code.trim())
            }
          >
            {busy
              ? "Working..."
              : mode === "create"
                ? "Create league"
                : "Join league"}
          </Button>
        </div>
      </form>
    </section>
  )
}
