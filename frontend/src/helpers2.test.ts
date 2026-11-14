import { describe, expect, it } from 'vitest'
import { domainOf, percentAt, ticks } from './timeline'
import { namesIn, topLevel, visibleGroups } from './tree'
import type { WbsGroup } from './types'

const group = (id: string, parent_id: string | null, name: string): WbsGroup => ({
  id, parent_id, name, depth: 0, checked: 10, flagged: 1, by_rule: [1, 0, 0], start: null, finish: null,
})
const TREE = [group('r', null, 'Project'), group('a', 'r', 'A'), group('a1', 'a', 'A1'), group('b', 'r', 'B')]

describe('timeline', () => {
  it('puts dates on a 0 to 100 axis with room at both ends', () => {
    const domain = domainOf(['2026-01-01T00:00:00', '2027-01-01T00:00:00', null])!
    expect(percentAt(domain, '2026-01-01T00:00:00')).toBeGreaterThan(0)
    expect(percentAt(domain, '2027-01-01T00:00:00')).toBeLessThan(100)
    expect(percentAt(domain, '2026-07-02T00:00:00')).toBeCloseTo(50, 0)
    expect(domainOf([null])).toBeNull()
  })

  it('labels the axis with at most 6 ticks, in months for a short span and years for a long one', () => {
    const short = ticks(domainOf(['2026-06-01T00:00:00', '2027-05-16T00:00:00'])!)
    expect(short.length).toBeLessThanOrEqual(6)
    expect(short[0].label).toMatch(/^[A-Z][a-z]{2} 20\d\d$/)
    const long = ticks(domainOf(['2022-01-01T00:00:00', '2027-10-20T00:00:00'])!)
    expect(long.length).toBeLessThanOrEqual(6)
    expect(long.every((t) => /^20\d\d$/.test(t.label))).toBe(true) // whole years, no months
  })
})

describe('tree', () => {
  it('starts inside a single root, and opens a group to show what is in it', () => {
    expect(topLevel(TREE).map((g) => g.name)).toEqual(['A', 'B'])
    expect(visibleGroups(TREE, new Set()).map((g) => g.name)).toEqual(['A', 'B'])
    expect(visibleGroups(TREE, new Set(['a'])).map((g) => g.name)).toEqual(['A', 'A1', 'B'])
  })

  it('names a group and everything inside it', () => {
    expect([...namesIn(TREE, 'a')].sort()).toEqual(['A', 'A1'])
    expect(namesIn(TREE, 'missing').size).toBe(0)
  })
})
