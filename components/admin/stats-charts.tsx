import type { DailyPoint } from "@/lib/stats"

/** Simple, dependency-free vertical bar chart built with flex + divs. */
export function BarChart({
  data,
  colorClass = "bg-primary",
  label,
}: {
  data: DailyPoint[]
  colorClass?: string
  label: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="flex h-40 items-end gap-0.5" role="img" aria-label={label}>
      {data.map((point) => {
        const pct = (point.value / max) * 100
        const dateLabel = new Date(point.day + "T00:00:00Z").toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", timeZone: "UTC" },
        )
        return (
          <div
            key={point.day}
            className="group relative flex flex-1 flex-col items-center justify-end"
          >
            <div
              className={`w-full rounded-t-sm ${colorClass} transition-opacity hover:opacity-80`}
              style={{ height: `${Math.max(pct, point.value > 0 ? 4 : 0)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs text-card-foreground shadow-md group-hover:block">
              <span className="font-semibold">{point.value}</span> · {dateLabel}
            </div>
          </div>
        )
      })}
    </div>
  )
}
