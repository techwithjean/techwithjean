"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { VideoHero } from "@/components/video-hero"
import { BracketView } from "@/components/bracket-view"
import { PredictionCard } from "@/components/prediction-card"
import { Leaderboard } from "@/components/leaderboard"
import {
  SparklesIcon,
  HeartHandshakeIcon,
  CheckIcon,
  CopyIcon,
  UserPlusIcon,
} from "lucide-react"
import { inviteCode, type Match } from "@/lib/tournament-data"
import type { Bracket } from "@/lib/football-data"
import type { AuthUser, SavedPrediction } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function Dashboard({
  user,
  initialPredictions,
  initialBracket,
}: {
  user: AuthUser | null
  initialPredictions: Record<string, SavedPrediction>
  initialBracket: Bracket
}) {
  const [baseTime, setBaseTime] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [predictionOpen, setPredictionOpen] = useState(false)
  const [proOpen, setProOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [predictions, setPredictions] =
    useState<Record<string, SavedPrediction>>(initialPredictions)

  // Adaptive polling: refresh every 30s while a match is live or delayed, and
  // back off to every 5 min when nothing is happening. This keeps live scores
  // fresh without wasting requests (and staying well under the API rate limit)
  // during quiet periods.
  const { data: bracket } = useSWR<Bracket>("/api/bracket", fetcher, {
    fallbackData: initialBracket,
    refreshInterval: (latest) =>
      latest?.hasLiveActivity ? 30_000 : 300_000,
    revalidateOnFocus: true,
  })

  const rounds = bracket?.rounds ?? initialBracket.rounds
  const allMatches = rounds.flatMap((r) => r.matches)
  const selectedMatch = allMatches.find((m) => m.id === selectedId) ?? null
  const isLive = allMatches.some((m) => m.status === "live")
  const isDelayed = allMatches.some((m) => m.status === "delayed")

  useEffect(() => {
    setBaseTime(Date.now())
  }, [])

  function selectMatch(m: Match) {
    setSelectedId(m.id)
    setPredictionOpen(true)
  }

  function copyLink() {
    navigator.clipboard
      ?.writeText(`https://myfinalscup.com/join/${inviteCode}`)
      .catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader
        user={user}
        onInvite={() => setInviteOpen(true)}
        onProUpgrade={() => setProOpen(true)}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <VideoHero />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <BracketView
            rounds={rounds}
            selectedId={selectedId}
            onSelectMatch={selectMatch}
            predictedIds={new Set(Object.keys(predictions))}
            isLive={isLive}
            isDelayed={isDelayed}
          />
          <div className="lg:sticky lg:top-20 lg:self-start">
            <Leaderboard />
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
          myFinalsCup.com · Built for the 2026 global finals. 10% of Pro
          proceeds support the U.S. Soccer Foundation.
        </div>
      </footer>

      <PredictionCard
        match={selectedMatch}
        baseTime={baseTime}
        open={predictionOpen}
        onOpenChange={setPredictionOpen}
        isAuthed={!!user}
        savedPrediction={
          selectedMatch ? predictions[selectedMatch.id] ?? null : null
        }
        onSaved={(matchId, a, b) =>
          setPredictions((prev) => ({ ...prev, [matchId]: { a, b } }))
        }
      />

      {/* Pro upgrade dialog */}
      <Dialog open={proOpen} onOpenChange={setProOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <SparklesIcon className="size-5 text-brand-orange" />
              Go Pro
            </DialogTitle>
            <DialogDescription>
              Unlock advanced stats, unlimited private leagues, and exclusive
              highlight reels.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-accent/40 bg-accent/10 p-3">
            <div className="flex items-start gap-2">
              <HeartHandshakeIcon className="mt-0.5 size-5 shrink-0 text-accent" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">10% of every Pro upgrade</span>{" "}
                goes to the U.S. Soccer Foundation to support youth soccer in
                under-resourced communities.
              </p>
            </div>
          </div>

          <ul className="flex flex-col gap-2 text-sm">
            {[
              "Detailed prediction analytics",
              "Unlimited private leagues",
              "Ad-free highlight & blooper feed",
              "Early access to the Final tickets ballot",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckIcon className="size-4 text-primary" />
                {f}
              </li>
            ))}
          </ul>

          <Button className="w-full bg-gradient-to-r from-brand-red to-brand-orange text-white hover:opacity-90">
            Upgrade to Pro · $4.99/mo
          </Button>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <UserPlusIcon className="size-5 text-primary" />
              Invite Friends
            </DialogTitle>
            <DialogDescription>
              Share your league link and see who can out-predict you this
              tournament.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-secondary px-3 py-2 font-mono text-sm ring-1 ring-border">
              myfinalscup.com/join/{inviteCode}
            </code>
            <Button onClick={copyLink}>
              {copied ? (
                <>
                  <CheckIcon className="size-4" /> Copied
                </>
              ) : (
                <>
                  <CopyIcon className="size-4" /> Copy
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
