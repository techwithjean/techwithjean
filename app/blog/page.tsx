import type { Metadata } from "next"
import { ArrowRightIcon, CalendarIcon, ClockIcon } from "lucide-react"
import { MarketingHeader } from "@/components/marketing/marketing-header"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { getAllPosts } from "@/lib/blog/posts"

export const metadata: Metadata = {
  title: "Blog — Soccer Prediction Tips & 2026 Finals Insights",
  description:
    "Bracket strategies, prediction tips, and 2026 finals insights to help you win your soccer prediction league on myFinalsCup.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "myFinalsCup Blog — Soccer Prediction Tips & 2026 Finals Insights",
    description:
      "Bracket strategies, prediction tips, and 2026 finals insights to help you win your soccer prediction league.",
    url: "/blog",
    type: "website",
  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function BlogIndexPage() {
  const allPosts = getAllPosts()
  const [featured, ...rest] = allPosts

  return (
    <div className="min-h-dvh bg-background">
      <MarketingHeader />

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mx-auto max-w-2xl text-center">
          <h1 className="text-balance font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
            The myFinalsCup Blog
          </h1>
          <p className="mt-4 text-pretty text-muted-foreground">
            Bracket strategies, prediction tips, and 2026 finals insights to
            help you climb the leaderboard.
          </p>
        </header>

        {featured && (
          <a
            href={`/blog/${featured.slug}`}
            className="group mt-12 block rounded-3xl border border-border bg-card p-6 transition-colors hover:border-brand-orange/50 sm:p-8"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-orange/40 bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-brand-orange">
              Featured
            </span>
            <h2 className="mt-4 text-balance font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              {featured.title}
            </h2>
            <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
              {featured.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" />
                {formatDate(featured.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon className="size-3.5" />
                {featured.readingMinutes} min read
              </span>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              Read article
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>
        )}

        {rest.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {rest.map((post) => (
              <a
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand-orange/50"
              >
                <h2 className="text-balance font-heading text-xl font-semibold tracking-tight">
                  {post.title}
                </h2>
                <p className="mt-2 flex-1 text-pretty text-sm text-muted-foreground">
                  {post.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="size-3.5" />
                    {formatDate(post.date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ClockIcon className="size-3.5" />
                    {post.readingMinutes} min read
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      <MarketingFooter />
    </div>
  )
}
