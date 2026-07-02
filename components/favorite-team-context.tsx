"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { saveFavoriteTeam } from "@/app/actions/favorite-team"

type FavoriteTeamContextValue = {
  /** The favorite team's name, or null if none is chosen. */
  favorite: string | null
  setFavorite: (name: string | null) => void
}

const FavoriteTeamContext = createContext<FavoriteTeamContextValue | null>(null)

export function FavoriteTeamProvider({
  initialFavorite = null,
  canPersist = false,
  children,
}: {
  initialFavorite?: string | null
  /** Only signed-in users have a profile row to persist onto. */
  canPersist?: boolean
  children: ReactNode
}) {
  const [favorite, setFavoriteState] = useState<string | null>(initialFavorite)

  const setFavorite = useCallback(
    (name: string | null) => {
      // Optimistically update the UI, then persist for signed-in users and
      // revert if the write fails.
      const previous = favorite
      setFavoriteState(name)
      if (!canPersist) return
      saveFavoriteTeam(name)
        .then((res) => {
          if (!res.ok) setFavoriteState(previous)
        })
        .catch(() => setFavoriteState(previous))
    },
    [favorite, canPersist],
  )

  const value = useMemo(
    () => ({ favorite, setFavorite }),
    [favorite, setFavorite],
  )

  return (
    <FavoriteTeamContext.Provider value={value}>
      {children}
    </FavoriteTeamContext.Provider>
  )
}

export function useFavoriteTeam() {
  const ctx = useContext(FavoriteTeamContext)
  if (!ctx) {
    throw new Error(
      "useFavoriteTeam must be used within a FavoriteTeamProvider",
    )
  }
  return ctx
}

/** True when the given team name is the current favorite. */
export function useIsFavoriteTeam(teamName: string | null | undefined) {
  const { favorite } = useFavoriteTeam()
  return !!teamName && !!favorite && teamName === favorite
}
