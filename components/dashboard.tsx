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
import { Input } from "@/components/ui/input"
import { SiteHeader } from "@/components/site-header"
import { VideoHero } from "@/components/video-hero"
import { BracketView } from "@/components/bracket-view"
import { FavoriteTeamProvider } from "@/components/favorite-team-context"
import { PredictionCard } from "@/components/prediction-card"
import { Leaderboard } from "@/components/leaderboard"
import { OnboardingDialog } from "@/components/onboarding-dialog"
import {
  HeartHandshakeIcon,
  CheckIcon,
  CopyIcon,
  UserPlusIcon,
  MailIcon,
} from "lucide-react"
import { createDonationCheckout } from "@/app/actions/donate"
import { scorePrediction } from "@/lib/scoring"
import { type Match, type Team } from "@/lib/tournament-data"
import type { Bracket } from "@/lib/football-data"
import type { LeagueWithStandings } from "@/lib/leagues"
import type { AuthUser, SavedPrediction } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function Dashboard({
  user,
  initialPredictions,
  initialBracket,
  initialFavorite = null,
  leagues = [],
  needsOnboarding = false,
  autoJoinedLeagueName = null,
}: {
  user: AuthUser | null
  initialPredictions: Record<string, SavedPrediction>
  initialBracket: Bracket
  initialFavorite?: string | null
  leagues?: LeagueWithStandings[]
  needsOnboarding?: boolean
  autoJoinedLeagueName?: string | null
}) {
  const [baseTime, setBaseTime] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [predictionOpen, setPredictionOpen] = useState(false)
  const [donateOpen, setDonateOpen] = useState(false)
  const [donationChoice, setDonationChoice] = useState<"10" | "20" | "other">(
    "20",
  )
  const [customAmount, setCustomAmount] = useState("")
  const [donorName, setDonorName] = useState("")
  const [donationPending, setDonationPending] = useState(false)
  const [donationError, setDonationError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
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

  // Build the favorite-team options from the actual teams in the live bracket
  // (deduped, alphabetized) so the picker always matches the real field rather
  // than a hardcoded list that can drift from who actually qualified.
  const teamOptions: Team[] = (() => {
    const map = new Map<string, Team>()
    for (const m of allMatches) {
      for (const side of [m.a, m.b]) {
        if (side.team) map.set(side.team.name, side.team)
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  })()
  const isLive = allMatches.some((m) => m.status === "live")
  const isDelayed = allMatches.some((m) => m.status === "delayed")

  // A prediction counts as "correct" once the match is final and it earns
  // points (right outcome or exact score). These get the blue border.
  const correctIds = new Set<string>()
  for (const m of allMatches) {
    const pred = predictions[m.id]
    if (
      pred &&
      m.status === "final" &&
      m.a.score != null &&
      m.b.score != null &&
      scorePrediction(pred, { a: m.a.score, b: m.b.score }) > 0
    ) {
      correctIds.add(m.id)
    }
  }

  useEffect(() => {
    setBaseTime(Date.now())
  }, [])

  function selectMatch(m: Match) {
    setSelectedId(m.id)
    setPredictionOpen(true)
  }

  // Invites share the user's first league. If they have none yet, the invite
  // dialog prompts them to create one instead of sharing a dead link.
  const primaryLeague = leagues[0] ?? null
  const inviteCode = primaryLeague?.inviteCode ?? null

  function copyLink() {
    if (!inviteCode) return
    navigator.clipboard
      ?.writeText(`https://myfinalscup.com/join/${inviteCode}`)
      .catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())

  // Open the user's own email client with the invite pre-filled. Using mailto
  // means the invite comes from their real address with zero setup or cost.
  // Assigning window.location.href is blocked inside the sandboxed preview
  // iframe, so we click a real anchor and, when embedded, target the top
  // window/new tab so the OS mail handler actually fires.
  function sendEmailInvite() {
    if (!emailValid || !inviteCode) return
    const link = `https://myfinalscup.com/join/${inviteCode}`
    const subject = "Join my Finals Cup league!"
    const body = `Hey! I'm running a Finals Cup prediction league for the tournament. Join me and see who can out-predict who:\n\n${link}\n\nSee you on the bracket!`
    const to = encodeURIComponent(inviteEmail.trim())
    const href = `mailto:${to}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`

    const a = document.createElement("a")
    a.href = href
    // In an embedded preview, break out to the top window so the handler runs.
    if (window.self !== window.top) a.target = "_blank"
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    a.remove()

    setInviteEmail("")
  }

  // Resolve the selected donation amount ($10 / $20 / custom "Other").
  const customValue = Number(customAmount)
  const donationAmount =
    donationChoice === "other" ? customValue : Number(donationChoice)
  const donationValid = donationAmount > 0

  async function handleDonate() {
    if (!donationValid || donationPending) return
    setDonationPending(true)
    setDonationError(null)

    // Only pass a typed name for anonymous donors; signed-in users are linked
    // by their account.
    const result = await createDonationCheckout(
      donationAmount,
      user ? undefined : donorName,
    )

    if (result.error || !result.url) {
      setDonationError(result.error ?? "Could not start checkout.")
      setDonationPending(false)
      return
    }

    // Stripe's hosted checkout can't render inside the preview iframe, so open
    // a new tab when embedded; otherwise navigate the current tab.
    if (typeof window !== "undefined" && window.self !== window.top) {
      window.open(result.url, "_blank", "noopener,noreferrer")
      setDonationPending(false)
    } else {
      window.location.href = result.url
    }
  }

  return (
    <FavoriteTeamProvider
      initialFavorite={initialFavorite}
      canPersist={!!user}
    >
    <div className="min-h-dvh bg-background">
      <SiteHeader
        user={user}
        teams={teamOptions}
        onInvite={() => setInviteOpen(true)}
        onDonate={() => setDonateOpen(true)}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <VideoHero />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <BracketView
            rounds={rounds}
            selectedId={selectedId}
            onSelectMatch={selectMatch}
            predictedIds={new Set(Object.keys(predictions))}
            correctIds={correctIds}
            isLive={isLive}
            isDelayed={isDelayed}
          />
          <div className="lg:sticky lg:top-20 lg:self-start">
            <Leaderboard leagues={leagues} isAuthed={!!user} />
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
          myFinalsCup.com · Built for the 2026 global finals. 20% of every
          donation supports the U.S. Soccer Foundation.
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

      {/* Donate dialog */}
      <Dialog open={donateOpen} onOpenChange={setDonateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <HeartHandshakeIcon className="size-5 text-accent" />
              Donate to Kids Soccer
            </DialogTitle>
            <DialogDescription>
              Chip in to keep myFinalsCup running for everyone this tournament.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-accent/40 bg-accent/10 p-3">
            <div className="flex items-start gap-2">
              <HeartHandshakeIcon className="mt-0.5 size-5 shrink-0 text-accent" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">20% of every donation</span>{" "}
                goes to the U.S. Soccer Foundation to support youth soccer in
                under-resourced communities.
              </p>
            </div>
          </div>

          <ul className="flex flex-col gap-2 text-sm">
            {[
              "Helps keep this app free (hosting costs money)",
              "Keeps friends and family following every game",
              "Builds a social space for folks to connect",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>

          {/* Optional name for donors who aren't signed in */}
          {!user && (
            <div className="grid gap-2">
              <label
                htmlFor="donor-name"
                className="text-sm font-medium text-foreground"
              >
                Your name{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <Input
                id="donor-name"
                type="text"
                maxLength={80}
                placeholder="So we can thank you"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
              />
            </div>
          )}

          {/* Amount picker: $10 / $20 / Other */}
          <div className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              Choose an amount
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(["10", "20", "other"] as const).map((choice) => {
                const selected = donationChoice === choice
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setDonationChoice(choice)}
                    aria-pressed={selected}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      selected
                        ? "border-brand-orange bg-brand-orange/10 text-foreground ring-2 ring-brand-orange"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {choice === "other" ? "Other" : `$${choice}`}
                  </button>
                )
              })}
            </div>
            {donationChoice === "other" && (
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="pl-7"
                  aria-label="Custom donation amount in dollars"
                  autoFocus
                />
              </div>
            )}
          </div>

          <Button
            onClick={handleDonate}
            disabled={!donationValid || donationPending}
            className="w-full bg-gradient-to-r from-brand-red to-brand-orange text-white hover:opacity-90"
          >
            <HeartHandshakeIcon className="size-4" />
            {donationPending
              ? "Starting checkout…"
              : donationValid
                ? `Donate $${donationAmount} to kids soccer`
                : "Donate to kids soccer"}
          </Button>

          {donationError && (
            <p role="alert" className="text-center text-sm text-destructive">
              {donationError}
            </p>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Secure checkout by Stripe. You can pay by card.
          </p>
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
              {inviteCode
                ? `Share ${primaryLeague?.name ?? "your league"} and see who can out-predict you this tournament.`
                : "Create a league first, then invite friends to compete with you."}
            </DialogDescription>
          </DialogHeader>

          {inviteCode ? (
            <>
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

              {/* Divider */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or send by email
                <span className="h-px flex-1 bg-border" />
              </div>

              {/* Send to email */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendEmailInvite()
                }}
                className="grid gap-2"
              >
                <label
                  htmlFor="invite-email"
                  className="text-sm font-medium text-foreground"
                >
                  Friend&apos;s email
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="invite-email"
                    type="email"
                    inputMode="email"
                    placeholder="friend@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!emailValid}>
                    <MailIcon className="size-4" /> Send
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Opens your email app with the invite ready to send.
                </p>
              </form>
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
              You&apos;re not in a league yet. Use the{" "}
              <span className="font-medium text-foreground">Your leagues</span>{" "}
              panel on the leaderboard to create or join one, then come back to
              invite friends.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* First-login onboarding: pick favorite + set up a league */}
      {user && needsOnboarding && (
        <OnboardingDialog
          open
          teams={teamOptions}
          autoJoinedLeagueName={autoJoinedLeagueName}
        />
      )}
    </div>
    </FavoriteTeamProvider>
  )
}
