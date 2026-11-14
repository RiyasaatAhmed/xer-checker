import { describe, expect, it } from 'vitest'
import { categorize } from './categories'
import type { ActivityRow, Kind } from './types'

const kinds: Kind[] = [
  { key: 'both', label: 'Nothing before or after', tone: 'red' },
  { key: 'before', label: 'Nothing before', tone: 'amber' },
  { key: 'after', label: 'Nothing after', tone: 'violet' },
]
const row = (code: string, kind?: string): ActivityRow => ({
  code, name: code, wbs: 'W', status: 'Not started', float_days: 10, duration_days: 1, start: null, finish: null, predecessors: 1, successors: 1, before: [], after: [], kind,
})

describe('categorize', () => {
  it('keeps only the kinds that occur, in the order the backend lists them', () => {
    const rows = [row('a', 'after'), row('b', 'both'), row('c', 'after')]
    const { categories, of } = categorize({ kinds }, rows)
    expect(categories.map((c) => c.key)).toEqual(['both', 'after'])
    expect(rows.map(of)).toEqual(['after', 'both', 'after'])
  })

  it('has one "Flagged" kind for a check that names none, or for rows without a kind', () => {
    expect(categorize({ kinds: [] }, [row('a')]).categories).toEqual([{ key: 'all', label: 'Flagged', tone: 's2' }])
    expect(categorize({ kinds }, [row('a')]).categories[0].key).toBe('all')
  })

  it('puts a row with an unknown kind in the first kind that occurs', () => {
    const { of } = categorize({ kinds }, [row('a', 'before'), row('b', 'mystery')])
    expect(of(row('b', 'mystery'))).toBe('before')
  })
})
