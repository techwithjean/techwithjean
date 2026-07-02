"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Flag } from "@/components/flag"
import { useFavoriteTeam } from "@/components/favorite-team-context"
import {
  createLeague,
  joinLeagueByCode,
  completeOnboarding,
} from "@/app/actions/leagues"
import type { Team } from "@/lib/tournament-data"
import { CheckIcon, TrophyIcon, UsersIcon } from "lucide-react"

type LeagueMode = "create" | "join" | "skip"

export function OnboardingDialog({
  open,
  teams,
  autoJoinedLeagueName,
}: {
  open: boolean
  teams: Team[]
  /** Set when the user arrived via an invite link and was auto-joined. */
  autoJoinedLeagueName?: string | null
}) {
  const router = useRouter()
  const { setFavorite } = useFavoriteTeam()

  const [step, setStep] = useState<1 | 2>(1)
  const [favorite, setFavoriteChoice] = useState<string>("")
  const [mode, setMode] = useState<LeagueMode>(
    autoJoinedLeagueName ? "skip" : "create",
  )
  const [leagueName, setLeagueName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function finish() {
    setSaving(true)
    setError(null)

    // 1) Persist the profile (creates the row, marks onboarded, saves favorite).
    const chosenFavorite = favorite || null
    const onboard = await completeOnboarding(chosenFavorite)
    if (!onboard.ok) {
      setError(onboard.error)
      setSaving(false)
      return
    }

    // 2) Optional league action. Auto-joined users default to "skip".
    if (mode === "create" && leagueName.trim()) {
      const res = await createLeague(leagueName)
      if (!res.ok) {
        setError(res.error)
        setSaving(false)
        return
      }
    } else if (mode === "join" && joinCode.trim()) {
      const res = await joinLeagueByCode(joinCode)
      if (!res.ok) {
        setError(res.error)
        setSaving(false)
        return
      }
    }

    // 3) Reflect the favorite in the UI immediately, then refresh server data.
    if (chosenFavorite) setFavorite(chosenFavorite)
    router.refresh()
  }

  return (
    // First-run setup: controlled `open` with no onOpenChange keeps it open
    // until the user finishes (can't be dismissed by escape/outside click).
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Welcome to Finals Cup!</DialogTitle>
              <DialogDescription>
                Pick your favorite team so we can highlight their matches. You
                can skip and set this later.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2 py-2">
              <Label htmlFor="favorite-team">Favorite team (optional)</Label>
              <Select
                value={favorite}
                onValueChange={(v) => setFavoriteChoice(v ?? "")}
              >
                <SelectTrigger id="favorite-team">
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      <span className="flex items-center gap-2">
                        <Flag team={t} className="h-3.5 w-5" />
                        {t.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setFavoriteChoice("")
                  setStep(2)
                }}
              >
                Skip
              </Button>
              <Button onClick={() => setStep(2)}>Continue</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Set up your league</DialogTitle>
              <DialogDescription>
                Compete with friends on a private leaderboard.
              </DialogDescription>
            </DialogHeader>

            {autoJoinedLeagueName ? (
              <div className="flex items-center gap-3 rounded-lg border border-brand-green/40 bg-brand-green/10 p-3 text-sm">
                <CheckIcon className="size-5 shrink-0 text-brand-green" />
                <span>
                  {"You've joined "}
                  <span className="font-semibold">{autoJoinedLeagueName}</span>
                  {". You're all set!"}
                </span>
              </div>
            ) : (
              <div className="grid gap-3 py-1">
                {/* Mode switcher */}
                <div className="grid grid-cols-3 gap-2">
                  <ModeButton
                    active={mode === "create"}
                    onClick={() => setMode("create")}
                    icon={<TrophyIcon className="size-4" />}
                    label="Create"
                  />
                  <ModeButton
                    active={mode === "join"}
                    onClick={() => setMode("join")}
                    icon={<UsersIcon className="size-4" />}
                    label="Join"
                  />
                  <ModeButton
                    active={mode === "skip"}
                    onClick={() => setMode("skip")}
                    icon={<CheckIcon className="size-4" />}
                    label="Skip"
                  />
                </div>

                {mode === "create" && (
                  <div className="grid gap-2">
                    <Label htmlFor="league-name">League name</Label>
                    <Input
                      id="league-name"
                      placeholder="Office World Cup Pool"
                      value={leagueName}
                      onChange={(e) => setLeagueName(e.target.value)}
                      maxLength={60}
                    />
                  </div>
                )}

                {mode === "join" && (
                  <div className="grid gap-2">
                    <Label htmlFor="join-code">Invite code</Label>
                    <Input
                      id="join-code"
                      placeholder="FINALS-7K3Q"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="font-mono uppercase"
                    />
                  </div>
                )}

                {mode === "skip" && (
                  <p className="text-sm text-muted-foreground">
                    No problem — you can create or join a league anytime from
                    the leaderboard.
                  </p>
                )}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={saving}
              >
                Back
              </Button>
              <Button
                onClick={finish}
                disabled={
                  saving ||
                  (!autoJoinedLeagueName &&
                    mode === "create" &&
                    !leagueName.trim()) ||
                  (!autoJoinedLeagueName &&
                    mode === "join" &&
                    !joinCode.trim())
                }
              >
                {saving ? "Setting up..." : "Enter Finals Cup"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:bg-secondary"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
