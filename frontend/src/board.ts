// The logic behind the check board: which checks are loud, in what order, and what changed.
// Pure functions on the backend's answer, so each can be tested alone.

import { percentText } from './format'
import type { Previous, RuleResult, RuleStatus, UploadSummary } from './types'

// ---------- Constants ----------

export const SHOW_ALL_UP_TO = 6 // with this many checks or fewer, every check is a row
export const ROWS_SHOWN = 8 // failing checks shown before "show more"
const SAME = 0.05 // a change smaller than this (in percent points) is "no change"
export const MAX_WORST = 3 // failing checks the verdict writes out as sentences; the rest are chips
export const SERIOUS = 2 // a check of this severity or more is serious: 1 minor, 2 serious, 3 critical
export const SMALL_SAMPLE = 30 // with fewer activities checked, a share says "1 of 4", not "25.0%"
export const TIMES_SHOWN = 10 // every check bar ends at this many times its limit, so bars compare down the board
const SHADE_STEPS = [0.05, 0.15, 0.4] // share flagged that steps a matrix cell's shade up: up to 5%, 15%, 40%, then more

export type Trend = { delta: number; better: boolean | null } // better is null when nothing changed

/** How far past its limit a check is: 9.3 means 9.3 times the limit. Null with no ratio (a limit of 0, or an index). */
export function ratio(rule: RuleResult): number | null {
  if (rule.status !== 'flag' || rule.measure !== 'percent' || rule.limit_percent <= 0) return null
  return rule.percent / rule.limit_percent
}

/** Failing checks first, the most serious first, then the most activities flagged. Ties keep their order. */
export function worstFirst(rules: RuleResult[]): RuleResult[] {
  return rules
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.status === 'flag')
    .sort((a, b) => b.r.severity - a.r.severity || b.r.count - a.r.count || a.i - b.i)
    .map(({ r }) => r)
}

/** A check that can stop a schedule being used: severity 2 or more. */
export function isSerious(rule: { severity?: number }): boolean {
  return (rule.severity ?? 1) >= SERIOUS
}

/** A failing check against its limit: { share: "46.6%", against: "9.3x the 5% limit" }, or "none allowed" for a limit of 0.
 *  A small file shows the share as "1 of 4". */
export function limitParts(rule: RuleResult, checked: number): { share: string; against: string } {
  if (rule.measure !== 'percent') return { share: '', against: `limit ${rule.limit_percent}` }
  const share = checked > 0 && checked < SMALL_SAMPLE ? `${rule.count.toLocaleString()} of ${checked.toLocaleString()}` : percentText(rule.percent)
  const over = ratio(rule)
  if (over !== null) return { share, against: `${over.toFixed(1)}x the ${rule.limit_percent}% limit` }
  return { share, against: rule.limit_percent > 0 ? `limit ${rule.limit_percent}%` : 'none allowed' }
}

/** Where a value sits on a check bar, in % of its width: every bar ends at TIMES_SHOWN times its own limit. */
export function barAt(value: number, limit: number): number {
  return limit > 0 ? Math.min(100, Math.max(0, (100 * value) / (limit * TIMES_SHOWN))) : 0
}

/** The check groups in the order the backend lists them: ["Logic", "Constraints", ...]. */
export function groupsOf(rules: { group: string }[]): string[] {
  return [...new Set(rules.map((r) => r.group))]
}

/** How many checks of each status, and how many of the failing ones are serious. */
export function tally(rules: { status: RuleStatus; severity?: number }[]): { flag: number; pass: number; na: number; serious: number } {
  return {
    serious: rules.filter((r) => r.status === 'flag' && isSerious(r)).length,
    flag: rules.filter((r) => r.status === 'flag').length,
    pass: rules.filter((r) => r.status === 'pass').length,
    na: rules.filter((r) => r.status === 'n/a').length,
  }
}

/** The change in one check since the last upload of the file. Null when there is nothing to compare. */
export function trendOf(rule: RuleResult, previous: Previous | null | undefined): Trend | null {
  const before = previous?.values[rule.id]
  if (before === undefined || rule.status === 'n/a') return null
  const delta = Math.round((rule.percent - before) * 10) / 10
  if (Math.abs(delta) < SAME) return { delta: 0, better: null }
  const lowerIsBetter = rule.direction === 'above'
  return { delta, better: lowerIsBetter ? delta < 0 : delta > 0 }
}

/** How many checks got worse and better since the last upload. */
export function changes(rules: RuleResult[], previous: Previous | null | undefined): { worse: number; better: number } | null {
  if (!previous) return null
  const trends = rules.map((r) => trendOf(r, previous)).filter((t): t is Trend => t !== null)
  return { worse: trends.filter((t) => t.better === false).length, better: trends.filter((t) => t.better === true).length }
}

/** What the map counts for each WBS group: one check, or one group of checks. Null means all flags together. */
export type Scope = { check: string } | { group: string } | null

/** The flagged count a WBS group shows for the scope. Checks of one group use the group's count of activities. */
export function flaggedIn(
  g: { flagged: number; by_rule: number[]; by_group?: Record<string, number> },
  scope: Scope,
  rules: { id: string }[],
): number {
  if (scope === null) return g.flagged
  if ('group' in scope) return g.by_group?.[scope.group] ?? g.flagged
  const at = rules.findIndex((r) => r.id === scope.check)
  return at >= 0 ? (g.by_rule[at] ?? 0) : g.flagged
}

/** The per-month flagged counts a WBS group shows for the scope: the check's own, or the highest of the group's checks. */
export function heatFor(heat: number[][] | undefined, scope: Scope, rules: { id: string; group: string }[]): number[] {
  if (!heat || heat.length === 0) return []
  const months = heat[0].length
  const rows = scope === null ? heat : 'group' in scope ? heat.filter((_, i) => rules[i]?.group === scope.group) : heat.filter((_, i) => rules[i]?.id === scope.check)
  return Array.from({ length: months }, (_, m) => Math.max(0, ...rows.map((row) => row[m] ?? 0)))
}

/** The sort that puts a check's worst activities first: the most float, or the most negative, or the most failed checks. */
export function worstSort(checkId: string): { by: 'float' | 'fails'; up: boolean } {
  if (checkId === 'high-float') return { by: 'float', up: false }
  if (checkId === 'negative-float') return { by: 'float', up: true }
  return { by: 'fails', up: false }
}

/** The shade of a matrix cell, 1 to 4, for the share of a group's checked activities that is flagged. 0 for none. */
export function shade(share: number): number {
  if (share <= 0) return 0
  return 1 + SHADE_STEPS.filter((step) => share > step).length
}

/** Uploads of one file, newest first, and the files in the order of their newest upload. */
export function byFile(uploads: UploadSummary[]): { name: string; uploads: UploadSummary[] }[] {
  const files = new Map<string, UploadSummary[]>()
  for (const u of uploads) files.set(u.file_name, [...(files.get(u.file_name) ?? []), u])
  return [...files].map(([name, list]) => ({ name, uploads: list }))
}
