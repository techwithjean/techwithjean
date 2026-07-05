"use client"

import { useRouter } from "next/navigation"

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const

export function RangeSelector({ current }: { current: number }) {
  const router = useRouter()

  return (
    <div
      role="group"
      aria-label="Select date range"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1"
    >
      {RANGES.map((r) => {
        const active = r.value === current
        return (
          <button
            key={r.value}
            type="button"
            aria-pressed={active}
            onClick={() => router.push(`/admin/stats?range=${r.value}`)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}
