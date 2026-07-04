"use client"

import { useState } from "react"
import {
  HeartIcon,
  HeartHandshakeIcon,
  UserPlusIcon,
  MenuIcon,
  LogInIcon,
  LogOutIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BrandLogo } from "@/components/brand-logo"
import { Flag } from "@/components/flag"
import { favoriteTeams, type Team } from "@/lib/tournament-data"
import { useFavoriteTeam } from "@/components/favorite-team-context"
import { signOut } from "@/app/actions/auth"
import type { AuthUser } from "@/lib/types"

function initials(value: string) {
  const base = value.split("@")[0]
  const parts = base.split(/[.\-_\s]+/).filter(Boolean)
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")
  return (letters || base.slice(0, 2)).toUpperCase()
}

export function SiteHeader({
  user,
  teams,
  onInvite,
  onDonate,
}: {
  user: AuthUser | null
  teams?: Team[]
  onInvite: () => void
  onDonate: () => void
}) {
  const { favorite, setFavorite } = useFavoriteTeam()
  const [menuOpen, setMenuOpen] = useState(false)
  // Prefer the live field passed from the bracket; fall back to the static list.
  const teamList = teams && teams.length > 0 ? teams : favoriteTeams

  const teamControl = (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs font-medium text-muted-foreground lg:inline">
        <HeartIcon className="-mt-0.5 mr-1 inline size-3.5 text-brand-green" />
        Favorite team
      </span>
      <Select value={favorite ?? undefined} onValueChange={(v) => setFavorite(v as string)}>
        <SelectTrigger className="h-9 w-[170px]" aria-label="Pick your favorite team to watch">
          <SelectValue placeholder="Pick a team to watch" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {teamList.map((t) => (
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
  )

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <a href="#" aria-label="myFinalsCup home">
            <BrandLogo />
          </a>
        </div>

        {/* Desktop controls */}
        <div className="hidden items-center gap-2 md:flex">
          {teamControl}
          <Button variant="outline" size="sm" onClick={onInvite}>
            <UserPlusIcon className="size-4" />
            Invite Friends
          </Button>
          {/* Donate temporarily hidden until Stripe donations are activated.
          <Button
            size="sm"
            onClick={onDonate}
            className="bg-gradient-to-r from-brand-red to-brand-orange text-white hover:opacity-90"
          >
            <HeartHandshakeIcon className="size-4" />
            Donate
          </Button>
          */}
          {user ? (
            <div className="flex items-center gap-2">
              <Avatar className="size-9 ring-1 ring-border">
                <AvatarFallback className="bg-primary/15 text-primary">
                  {initials(user.username || user.email)}
                </AvatarFallback>
              </Avatar>
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label="Sign out"
                >
                  <LogOutIcon className="size-4" />
                </Button>
              </form>
            </div>
          ) : (
            <Button
              render={<a href="/auth/login" />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              <LogInIcon className="size-4" />
              Sign in
            </Button>
          )}
        </div>

        {/* Mobile trigger */}
        <div className="flex items-center gap-2 md:hidden">
          {user && (
            <Avatar className="size-9 ring-1 ring-border">
              <AvatarFallback className="bg-primary/15 text-primary">
                {initials(user.username || user.email)}
              </AvatarFallback>
            </Avatar>
          )}
          <Button
            variant="outline"
            size="icon"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MenuIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Mobile panel */}
      {menuOpen && (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {teamControl}
            <Button variant="outline" onClick={onInvite} className="justify-start">
              <UserPlusIcon className="size-4" />
              Invite Friends
            </Button>
            {/* Donate temporarily hidden until Stripe donations are activated.
            <Button
              onClick={onDonate}
              className="justify-start bg-gradient-to-r from-brand-red to-brand-orange text-white hover:opacity-90"
            >
              <HeartHandshakeIcon className="size-4" />
              Donate to kids soccer
            </Button>
            */}
            {user ? (
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full justify-start"
                >
                  <LogOutIcon className="size-4" />
                  Sign out
                </Button>
              </form>
            ) : (
              <Button
                render={<a href="/auth/login" />}
                nativeButton={false}
                variant="outline"
                className="justify-start"
              >
                <LogInIcon className="size-4" />
                Sign in
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
