"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  CopyIcon,
  CheckIcon,
  CrownIcon,
  UsersIcon,
} from "lucide-react"
import { leaderboard, inviteCode } from "@/lib/tournament-data"

export function Leaderboard() {
  const [copied, setCopied] = useState(false)

  function copyCode() {
    const link = `https://myfinalscup.com/join/${inviteCode}`
    navigator.clipboard?.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="flex flex-col rounded-2xl bg-card p-4 ring-1 ring-border sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <UsersIcon className="size-4" />
          </span>
          <div>
            <h2 className="font-heading text-base font-bold leading-tight">
              The Group Chat League
            </h2>
            <p className="text-xs text-muted-foreground">12 friends · Private</p>
          </div>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-1">
        {leaderboard.map((entry) => (
          <li
            key={entry.rank}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2",
              entry.isYou ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-secondary/60",
            )}
          >
            <span
              className={cn(
                "w-5 text-center text-sm font-bold tabular-nums",
                entry.rank === 1 ? "text-brand-yellow" : "text-muted-foreground",
              )}
            >
              {entry.rank === 1 ? <CrownIcon className="mx-auto size-4" /> : entry.rank}
            </span>
            <Avatar className="size-8 ring-1 ring-border">
              <AvatarFallback
                style={{
                  backgroundColor: `oklch(0.4 0.12 ${entry.avatarHue})`,
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
            {inviteCode}
          </code>
          <Button size="sm" onClick={copyCode} aria-live="polite">
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
    </section>
  )
}
