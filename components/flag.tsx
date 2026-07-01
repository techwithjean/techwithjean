import { cn } from "@/lib/utils"
import type { Team } from "@/lib/tournament-data"

export function Flag({
  team,
  className,
}: {
  team: Team | null
  className?: string
}) {
  if (!team) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[3px] bg-muted text-[10px] font-medium text-muted-foreground ring-1 ring-border",
          className,
        )}
      >
        ?
      </span>
    )
  }
  const src = team.crestUrl
    ? team.crestUrl
    : `https://flagcdn.com/h40/${team.code}.png`
  return (
    <img
      src={src || "/placeholder.svg"}
      srcSet={
        team.crestUrl ? undefined : `https://flagcdn.com/h80/${team.code}.png 2x`
      }
      alt={`${team.name} flag`}
      loading="lazy"
      className={cn(
        "shrink-0 rounded-[3px] object-cover ring-1 ring-border",
        className,
      )}
    />
  )
}
