import { describe, expect, it } from 'vitest'
import { categorize } from './categories'
import type { ActivityRow } from './types'

const row = (code: string, predecessors: number, successors: number, float_days: number | null = 10): ActivityRow => ({
  code, name: code, wbs: 'W', status: 'Not started', float_days, duration_days: 1, start: null, finish: null, predecessors, successors, before: [], after: [],
})

describe('categorize', () => {
  it('tells missing links apart by which side is missing', () => {
    const rows = [row('a', 0, 2), row('b', 3, 0), row('c', 0, 0)]
    const { categories, of } = categorize('Missing links', rows)
    expect(categories.map((c) => c.key)).toEqual(['both', 'before', 'after']) // only the kinds that occur, worst first
    expect(rows.map(of)).toEqual(['before', 'after', 'both'])
  })

  it('splits float into 3 equal ranges, light to dark, with the largest value in the last', () => {
    const rows = [row('a', 1, 1, 45), row('b', 1, 1, 100), row('c', 1, 1, 180)]
    const { categories, of } = categorize('High float', rows)
    expect(categories.map((c) => c.label)).toEqual(['45 to 90 days', '90 to 135 days', '135 to 180 days'])
    expect(rows.map(of)).toEqual(['f0', 'f1', 'f2'])
  })

  it('uses reds for negative float, and one category when every value is the same', () => {
    expect(categorize('Negative float', [row('a', 1, 1, -3), row('b', 1, 1, -30)]).categories[0].tone).toBe('r1')
    expect(categorize('High float', [row('a', 1, 1, 60), row('b', 1, 1, 60)]).categories).toEqual([{ key: 'f0', label: '60 days', tone: 's2' }])
  })
})
