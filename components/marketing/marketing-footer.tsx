import { BrandLogo } from "@/components/brand-logo"

/** Shared footer for the public landing page and blog. */
export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3">
          <BrandLogo size="sm" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Predict the 2026 global soccer finals, run private leagues with
            friends, and climb the leaderboard.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a
            href="/blog"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Blog
          </a>
          <a
            href="/auth/sign-up"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Create account
          </a>
          <a
            href="/auth/login"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </a>
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
          myFinalsCup.com · Built for the 2026 global finals. 20% of every
          donation supports the U.S. Soccer Foundation.
        </div>
      </div>
    </footer>
  )
}
