import { cn } from "@/lib/utils"
import { TrophyIcon } from "lucide-react"

export function BrandLogo({
  className,
  size = "default",
}: {
  className?: string
  size?: "default" | "sm"
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative inline-flex items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 rotate-45 rounded-md border border-brand-yellow/40"
        />
        <TrophyIcon
          className={cn(
            "relative text-brand-yellow drop-shadow-[0_0_8px_oklch(0.86_0.17_95_/_0.35)]",
            size === "sm" ? "size-5" : "size-6",
          )}
        />
      </span>
      <span
        className={cn(
          "font-heading font-extrabold tracking-tight leading-none",
          size === "sm" ? "text-lg" : "text-xl sm:text-2xl",
        )}
      >
        <span className="font-script font-normal text-brand-yellow pr-0.5">
          my
        </span>
        <span className="bg-gradient-to-r from-brand-red to-brand-orange bg-clip-text text-transparent">
          finals
        </span>
        <span className="text-brand-blue">cup</span>
      </span>
      <FlyingSoccerBall
        className={cn(
          "shrink-0 w-auto text-foreground drop-shadow-[0_0_6px_oklch(1_0_0_/_0.25)]",
          size === "sm" ? "h-5" : "h-6",
        )}
      />
    </div>
  )
}

function FlyingSoccerBall({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* motion streaks trailing the ball (tapered toward the ball) */}
      <path d="M6 5h6" strokeWidth={1.2} />
      <path d="M2 8.5h9" strokeWidth={1.35} />
      <path d="M0 12h11" strokeWidth={1.6} />
      <path d="M2 15.5h9" strokeWidth={1.35} />
      <path d="M6 19h6" strokeWidth={1.2} />

      {/* ball */}
      <circle cx="23" cy="12" r="8" />
      {/* central pentagon */}
      <path d="M23 8.8 L26.04 11.01 L24.88 14.59 L21.12 14.59 L19.96 11.01 Z" />
      {/* spokes from pentagon vertices to the rim */}
      <path d="M23 8.8V4.2" />
      <path d="M26.04 11.01l4.3-1.4" />
      <path d="M24.88 14.59l2.7 3.7" />
      <path d="M21.12 14.59l-2.7 3.7" />
      <path d="M19.96 11.01l-4.3-1.4" />
    </svg>
  )
}
