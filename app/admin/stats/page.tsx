import {
  EyeIcon,
  UsersIcon,
  UserPlusIcon,
  TrophyIcon,
  TargetIcon,
  CalendarDaysIcon,
  ArrowLeftIcon,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { StatCard } from "@/components/admin/stat-card"
import { BarChart } from "@/components/admin/stats-charts"
import { RangeSelector } from "@/components/admin/range-selector"
import { getAdminUser } from "@/lib/admin"
import { getAppStats, getSiteStats } from "@/lib/stats"

const ALLOWED_RANGES = [7, 30, 90]

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Site Stats · myFinalsCup",
  robots: { index: false, follow: false },
}

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const admin = await getAdminUser()
  // Non-admins get a 404 so the page's existence isn't revealed.
  if (!admin) notFound()

  const { range } = await searchParams
  const days = ALLOWED_RANGES.includes(Number(range)) ? Number(range) : 30
  const rangeLabel = `last ${days} days`

  const [site, app] = await Promise.all([
    getSiteStats(days),
    getAppStats(days),
  ])

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-1">
        <Link
          href="/"
          className="mb-2 inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to app
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Site Stats</h1>
            <p className="text-sm text-muted-foreground">
              First-party analytics · {rangeLabel} · signed in as {admin.email}
            </p>
          </div>
          <RangeSelector current={days} />
        </div>
      </div>

      {/* Traffic */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Traffic
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total views"
            value={site.totalViews}
            hint={rangeLabel}
            icon={EyeIcon}
          />
          <StatCard
            label="Unique visitors"
            value={site.totalVisitors}
            hint={rangeLabel}
            icon={UsersIcon}
          />
          <StatCard
            label="Views (7d)"
            value={site.viewsLast7}
            hint="Past week"
            icon={CalendarDaysIcon}
          />
          <StatCard
            label="Views today"
            value={site.viewsToday}
            hint="Since midnight UTC"
            icon={EyeIcon}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium text-card-foreground">
              Daily page views
            </h3>
            <BarChart
              data={site.dailyViews}
              colorClass="bg-primary"
              label={`Daily page views over the ${rangeLabel}`}
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium text-card-foreground">
              Daily unique visitors
            </h3>
            <BarChart
              data={site.dailyVisitors}
              colorClass="bg-[var(--brand-green)]"
              label={`Daily unique visitors over the ${rangeLabel}`}
            />
          </div>
        </div>
      </section>

      {/* Top pages */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Top pages
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {site.topPaths.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No visits recorded yet. Data appears as people browse the live
              site.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {site.topPaths.map((p) => (
                <li
                  key={p.path}
                  className="flex items-center justify-between gap-4 px-4 py-2.5"
                >
                  <span className="truncate font-mono text-sm text-card-foreground">
                    {p.path}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    <span className="font-semibold text-card-foreground">
                      {p.views.toLocaleString()}
                    </span>{" "}
                    views · {p.visitors.toLocaleString()} visitors
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* App metrics */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          App metrics
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total users"
            value={app.totalUsers}
            icon={UsersIcon}
          />
          <StatCard
            label="New users (7d)"
            value={app.newUsersLast7}
            hint="Past week"
            icon={UserPlusIcon}
          />
          <StatCard
            label="Leagues"
            value={app.totalLeagues}
            icon={TrophyIcon}
          />
          <StatCard
            label="Predictions"
            value={app.totalPredictions}
            icon={TargetIcon}
          />
        </div>

        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium text-card-foreground">
            Signups per day
          </h3>
          <BarChart
            data={app.signupsByDay}
            colorClass="bg-[var(--brand-orange)]"
            label={`New signups per day over the ${rangeLabel}`}
          />
        </div>
      </section>
    </main>
  )
}
