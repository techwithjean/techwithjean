import type { Bracket } from "@/lib/football-data"

/** A final scoreline for a completed match. */
export type FinalResult = { a: number; b: number }

/** A stored prediction scoreline. */
export type PredictionScore = { a: number; b: number }

/**
 * Points earned by a single prediction against a match's final result:
 *   3 — exact scoreline
 *   1 — correct outcome (right winner, or correctly picked a draw)
 *   0 — otherwise
 */
export function scorePrediction(
  pred: PredictionScore,
  result: FinalResult,
): number {
  // Exact scoreline.
  if (pred.a === result.a && pred.b === result.b) return 3

  // Correct outcome: compare the sign of (home - away) for both.
  const predOutcome = Math.sign(pred.a - pred.b)
  const resultOutcome = Math.sign(result.a - result.b)
  if (predOutcome === resultOutcome) return 1

  return 0
}

/**
 * Build a map of `matchId -> final result` for every finished match in the
 * bracket that has both scores. Only these matches are eligible for scoring.
 */
export function finalResultsFromBracket(
  bracket: Bracket,
): Map<string, FinalResult> {
  const results = new Map<string, FinalResult>()
  for (const round of bracket.rounds) {
    for (const m of round.matches) {
      if (m.status === "final" && m.a.score != null && m.b.score != null) {
        results.set(m.id, { a: m.a.score, b: m.b.score })
      }
    }
  }
  return results
}

/** A prediction row as stored in the database. */
export type PredictionRow = {
  user_id: string
  match_id: string
  predicted_a: number
  predicted_b: number
}

/**
 * Total each user's points across all finished matches. Predictions for
 * matches that aren't final (or unknown) contribute nothing.
 */
export function totalPointsByUser(
  predictions: PredictionRow[],
  results: Map<string, FinalResult>,
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const p of predictions) {
    const result = results.get(p.match_id)
    if (!result) continue
    const pts = scorePrediction({ a: p.predicted_a, b: p.predicted_b }, result)
    totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + pts)
  }
  return totals
}
