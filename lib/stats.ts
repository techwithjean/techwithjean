import { createAdminClient } from "@/lib/supabase/admin"

export type DailyPoint = { day: string; value: number }
export type PathCount = { path: string; views: number; visitors: number }

export type SiteStats = {
  totalViews: number
  totalVisitors: number
  viewsLast7: number
  viewsToday: number
  dailyViews: DailyPoint[]
  dailyVisitors: DailyPoint[]
  topPaths: PathCount[]
}

export type AppStats = {
  totalUsers: number
  totalLeagues: number
  totalPredictions: number
  newUsersLast7: number
  signupsByDay: DailyPoint[]
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function lastNDays(n: number): string[] {
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    days.push(isoDay(d))
  }
  return days
}

/** First-party visit stats from the page_visits table (last `days` days). */
export async function getSiteStats(days = 30): Promise<SiteStats> {
  const admin = createAdminClient()
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - (days - 1))
  const sinceDay = isoDay(since)
  const today = isoDay(new Date())

  const { data, error } = await admin
    .from("page_visits")
    .select("day, path, visitor_hash, hits")
    .gte("day", sinceDay)

  const rows = error || !data ? [] : data

  const viewsByDay = new Map<string, number>()
  const visitorsByDay = new Map<string, Set<string>>()
  const viewsByPath = new Map<string, number>()
  const visitorsByPath = new Map<string, Set<string>>()
  const allVisitors = new Set<string>()
  let totalViews = 0

  for (const r of rows) {
    const hits = r.hits ?? 1
    totalViews += hits
    allVisitors.add(r.visitor_hash)

    viewsByDay.set(r.day, (viewsByDay.get(r.day) ?? 0) + hits)
    if (!visitorsByDay.has(r.day)) visitorsByDay.set(r.day, new Set())
    visitorsByDay.get(r.day)!.add(r.visitor_hash)

    viewsByPath.set(r.path, (viewsByPath.get(r.path) ?? 0) + hits)
    if (!visitorsByPath.has(r.path)) visitorsByPath.set(r.path, new Set())
    visitorsByPath.get(r.path)!.add(r.visitor_hash)
  }

  const dayKeys = lastNDays(days)
  const dailyViews = dayKeys.map((day) => ({
    day,
    value: viewsByDay.get(day) ?? 0,
  }))
  const dailyVisitors = dayKeys.map((day) => ({
    day,
    value: visitorsByDay.get(day)?.size ?? 0,
  }))

  const last7 = new Set(lastNDays(7))
  const viewsLast7 = dailyViews
    .filter((p) => last7.has(p.day))
    .reduce((s, p) => s + p.value, 0)

  const topPaths: PathCount[] = [...viewsByPath.entries()]
    .map(([path, views]) => ({
      path,
      views,
      visitors: visitorsByPath.get(path)?.size ?? 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  return {
    totalViews,
    totalVisitors: allVisitors.size,
    viewsLast7,
    viewsToday: viewsByDay.get(today) ?? 0,
    dailyViews,
    dailyVisitors,
    topPaths,
  }
}

/** Business metrics derived from existing app tables. */
export async function getAppStats(days = 30): Promise<AppStats> {
  const admin = createAdminClient()

  const [usersRes, leaguesRes, predictionsRes] = await Promise.all([
    admin.from("profiles").select("id, created_at"),
    admin.from("leagues").select("id", { count: "exact", head: true }),
    admin.from("predictions").select("id", { count: "exact", head: true }),
  ])

  const users = usersRes.data ?? []
  const dayKeys = lastNDays(days)
  const signupsMap = new Map<string, number>()
  for (const u of users) {
    if (!u.created_at) continue
    const day = isoDay(new Date(u.created_at))
    signupsMap.set(day, (signupsMap.get(day) ?? 0) + 1)
  }
  const signupsByDay = dayKeys.map((day) => ({
    day,
    value: signupsMap.get(day) ?? 0,
  }))

  const last7 = new Set(lastNDays(7))
  const newUsersLast7 = signupsByDay
    .filter((p) => last7.has(p.day))
    .reduce((s, p) => s + p.value, 0)

  return {
    totalUsers: users.length,
    totalLeagues: leaguesRes.count ?? 0,
    totalPredictions: predictionsRes.count ?? 0,
    newUsersLast7,
    signupsByDay,
  }
}
