// How the activities are sorted, and the row shape the list works with.

import type { ActivityRow } from './types'

export type Column = 'n' | 'code' | 'float' | 'fails'
export type Row = ActivityRow & { n: number } // n: its place in the checker's list

/** The sort choices, as the Sort menu shows them. "worst" has no column of its own: it depends on the check (see board.worstSort). */
export const SORTS = {
  worst: { label: 'Worst first', by: 'n', up: true },
  file: { label: 'File order', by: 'n', up: true },
  'float-desc': { label: 'Float, largest first', by: 'float', up: false },
  'float-asc': { label: 'Float, smallest first', by: 'float', up: true },
  fails: { label: 'Most checks failed', by: 'fails', up: false },
  id: { label: 'Activity ID', by: 'code', up: true },
} as const satisfies Record<string, { label: string; by: Column; up: boolean }>
export type SortKey = keyof typeof SORTS

/** Sort order for one column. A blank float sorts as the lowest. */
export function compare(a: Row, b: Row, by: Column): number {
  const value = (r: Row): number | string =>
    by === 'n' ? r.n : by === 'code' ? r.code : by === 'fails' ? (r.fails ?? 1) : (r.float_days ?? Number.NEGATIVE_INFINITY)
  const x = value(a), y = value(b)
  return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })
}
