// How the activities behind a check are told apart on the dot grid: one color per kind.
// Missing links: which side is missing. Float checks: how much float, in 3 steps.

import type { ActivityRow } from './types'

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

const MISSING: Record<string, Category> = {
  both: { key: 'both', label: 'Nothing before or after', tone: 'red' },
  before: { key: 'before', label: 'Nothing before', tone: 'amber' },
  after: { key: 'after', label: 'Nothing after', tone: 'violet' },
  other: { key: 'other', label: 'Linked both sides', tone: 's2' },
}
const MISSING_ORDER = ['both', 'before', 'after', 'other']
const FLOAT_TONES = ['s1', 's2', 's3'] // slate, light to dark
const NEGATIVE_TONES = ['r1', 'r2', 'r3'] // red, light to dark
const STEPS = 3 // float is split into this many equal ranges

/** The categories for one check's activities, and the function that sorts a row into one. */
export function categorize(ruleName: string, rows: ActivityRow[]): Categorized {
  if (ruleName === 'Missing links') {
    const of = (r: ActivityRow): string =>
      r.predecessors === 0 && r.successors === 0 ? 'both' : r.predecessors === 0 ? 'before' : r.successors === 0 ? 'after' : 'other'
    const present = new Set(rows.map(of))
    return { categories: MISSING_ORDER.filter((k) => present.has(k)).map((k) => MISSING[k]), of }
  }
  const floats = rows.map((r) => r.float_days).filter((d): d is number => d !== null)
  if (floats.length === 0) return { categories: [{ key: 'all', label: 'Activities', tone: 's2' }], of: () => 'all' }
  const lo = Math.min(...floats)
  const hi = Math.max(...floats)
  const tones = ruleName === 'Negative float' ? NEGATIVE_TONES : FLOAT_TONES
  if (hi === lo) return { categories: [{ key: 'f0', label: `${Math.round(lo)} days`, tone: tones[1] }], of: () => 'f0' }
  const width = (hi - lo) / STEPS
  const stepOf = (d: number) => Math.min(STEPS - 1, Math.floor((d - lo) / width))
  const present = new Set(floats.map(stepOf))
  const categories = Array.from({ length: STEPS }, (_, i) => i)
    .filter((i) => present.has(i))
    .map((i) => ({ key: `f${i}`, label: `${Math.round(lo + i * width)} to ${Math.round(i === STEPS - 1 ? hi : lo + (i + 1) * width)} days`, tone: tones[i] }))
  return { categories, of: (r) => (r.float_days === null ? 'f0' : `f${stepOf(r.float_days)}`) }
}
