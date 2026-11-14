// How the list of activities is sorted. Shared by the list view and the component that holds the state.

import type { ActivityRow } from './types'

export type Column = 'n' | 'code' | 'links' | 'float' | 'start'
export type Row = ActivityRow & { n: number } // n: its place in the checker's list

/** Sort order for one column. A blank float sorts as the lowest. */
export function compare(a: Row, b: Row, by: Column): number {
  const value = (r: Row): number | string => {
    switch (by) {
      case 'n': return r.n
      case 'code': return r.code
      case 'links': return Math.min(r.predecessors, r.successors) // the side with fewest links first
      case 'float': return r.float_days ?? Number.NEGATIVE_INFINITY
      case 'start': return r.start ?? ''
    }
  }
  const x = value(a), y = value(b)
  return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })
}
