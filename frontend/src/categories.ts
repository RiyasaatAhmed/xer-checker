// How the activities behind a check are told apart: one color per kind. The backend names the kinds
// (RuleResult.kinds) and sorts each activity into one (ActivityRow.kind); this only picks the ones that occur.

import type { ActivityRow, RuleResult } from './types'

export interface Category {
  key: string
  label: string
  tone: string // a CSS class suffix: t-<tone>
}

export interface Categorized {
  categories: Category[] // the kinds that occur, in the order the legend shows them
  of: (row: ActivityRow) => string // a row's category key
}

// ---------- Constants ----------

const ALL: Category = { key: 'all', label: 'Flagged', tone: 's2' } // for a check that names no kinds, or an upload that predates them

/** The categories for one check's activities, and the function that sorts a row into one. */
export function categorize(rule: Pick<RuleResult, 'kinds'>, rows: ActivityRow[]): Categorized {
  const present = new Set(rows.map((r) => r.kind ?? ALL.key))
  const categories = (rule.kinds ?? []).filter((k) => present.has(k.key))
  if (categories.length === 0) return { categories: [ALL], of: () => ALL.key }
  const known = new Set(categories.map((c) => c.key))
  return { categories, of: (r) => (known.has(r.kind ?? '') ? (r.kind as string) : categories[0].key) }
}
