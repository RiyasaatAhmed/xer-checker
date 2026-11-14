import { describe, expect, it } from 'vitest'
import { barAt, byFile, changes, flaggedIn, groupsOf, heatFor, isSerious, overText, ratio, shade, tally, trendOf, worstFirst, worstSort } from './board'
import type { RuleResult, UploadSummary } from './types'

function rule(id: string, over: Partial<RuleResult> = {}): RuleResult {
  return { id, name: id, group: 'Logic', measure: 'percent', direction: 'above', severity: 1, dcma_section: '', limit_percent: 5, count: 0, percent: 0, status: 'pass', kinds: [], ...over }
}

describe('ratio', () => {
  it('says how many times over the limit a failing check is', () => {
    expect(ratio(rule('a', { status: 'flag', percent: 46.6 }))).toBeCloseTo(9.32)
  })
  it('has none for a passing check, a limit of 0, or an index', () => {
    expect(ratio(rule('a', { percent: 1 }))).toBeNull()
    expect(ratio(rule('a', { status: 'flag', percent: 3, limit_percent: 0 }))).toBeNull()
    expect(ratio(rule('a', { status: 'flag', percent: 0.5, limit_percent: 0.95, measure: 'index' }))).toBeNull()
  })
})

describe('worstFirst', () => {
  it('lists only failing checks: the most serious first, then the most activities flagged', () => {
    const rules = [
      rule('minor', { status: 'flag', severity: 1, percent: 90, count: 300 }),
      rule('ok', { status: 'pass', severity: 3 }),
      rule('few', { status: 'flag', severity: 3, percent: 6, count: 1 }),
      rule('many', { status: 'flag', severity: 3, percent: 50, count: 109 }),
    ]
    expect(worstFirst(rules).map((r) => r.id)).toEqual(['many', 'few', 'minor'])
  })
  it('keeps file order for equal checks', () => {
    const rules = [rule('a', { status: 'flag', limit_percent: 0, percent: 2, count: 4 }), rule('b', { status: 'flag', limit_percent: 0, percent: 2, count: 4 })]
    expect(worstFirst(rules).map((r) => r.id)).toEqual(['a', 'b'])
  })
})

describe('serious checks and their words', () => {
  it('calls a check of severity 2 or more serious', () => {
    expect([1, 2, 3].map((severity) => isSerious({ severity }))).toEqual([false, true, true])
    expect(isSerious({})).toBe(false) // an older check with no severity
  })
  it('gives each failing check its unit: times the limit, or activities when the limit is 0', () => {
    expect(overText(rule('a', { status: 'flag', percent: 46.6, count: 170 }))).toBe('9.3x limit')
    expect(overText(rule('a', { status: 'flag', percent: 0.3, count: 1, limit_percent: 0 }))).toBe('1 activity')
    expect(overText(rule('a', { status: 'flag', percent: 29.9, count: 109, limit_percent: 0 }))).toBe('109 activities')
  })
  it('draws every bar on one scale: the limit at a tenth of the bar, ten times the limit at its end', () => {
    expect(barAt(5, 5)).toBe(10)
    expect(barAt(15, 5)).toBe(30) // 3x the limit
    expect(barAt(14, 10)).toBeCloseTo(14) // 1.4x a 10% limit
    expect(barAt(90, 5)).toBe(100) // past the end: capped
    expect(barAt(3, 0)).toBe(0) // a limit of 0 has no bar
  })
})

describe('groups and tallies', () => {
  it('keeps the groups in the order the checks come in, once each', () => {
    expect(groupsOf([{ group: 'Logic' }, { group: 'Float' }, { group: 'Logic' }, { group: 'Dates' }])).toEqual(['Logic', 'Float', 'Dates'])
  })
  it('counts each status', () => {
    expect(tally([rule('a', { status: 'flag' }), rule('b'), rule('c'), rule('d', { status: 'n/a' })])).toEqual({ flag: 1, pass: 2, na: 1, serious: 0 })
    expect(tally([rule('a', { status: 'flag', severity: 2 }), rule('b', { status: 'pass', severity: 3 })]).serious).toBe(1) // only failing checks count
  })
})

describe('change since the last upload', () => {
  const previous = { upload_id: 'x', uploaded_at: '2026-11-01T00:00:00Z', values: { a: 52, b: 10, c: 0.9 } }
  it('is better when a check that fails above its limit goes down', () => {
    expect(trendOf(rule('a', { percent: 46.6 }), previous)).toEqual({ delta: -5.4, better: true })
  })
  it('is worse when it goes up, and the other way round for a check that fails below its limit', () => {
    expect(trendOf(rule('b', { percent: 12 }), previous)).toEqual({ delta: 2, better: false })
    expect(trendOf(rule('c', { percent: 1.1, direction: 'below' }), previous)).toEqual({ delta: 0.2, better: true })
  })
  it('says nothing changed for a tiny move, and nothing for a check it cannot compare', () => {
    expect(trendOf(rule('b', { percent: 10.01 }), previous)).toEqual({ delta: 0, better: null })
    expect(trendOf(rule('new'), previous)).toBeNull()
    expect(trendOf(rule('a'), null)).toBeNull()
  })
  it('counts how many got worse and better', () => {
    expect(changes([rule('a', { percent: 46.6 }), rule('b', { percent: 12 }), rule('new')], previous)).toEqual({ worse: 1, better: 1 })
    expect(changes([rule('a')], null)).toBeNull()
  })
})

describe('what the map counts', () => {
  const group = { flagged: 10, by_rule: [4, 0, 7], by_group: { Logic: 5, Float: 7 } }
  const rules = [{ id: 'missing-links' }, { id: 'leads' }, { id: 'high-float' }]
  it('counts all flags, one check, or one group of checks', () => {
    expect(flaggedIn(group, null, rules)).toBe(10)
    expect(flaggedIn(group, { check: 'high-float' }, rules)).toBe(7)
    expect(flaggedIn(group, { group: 'Logic' }, rules)).toBe(5)
  })
  it('shows a month for the check, or the highest of the group', () => {
    const heat = [[1, 0], [3, 2], [0, 5]]
    const named = [{ id: 'a', group: 'Logic' }, { id: 'b', group: 'Logic' }, { id: 'c', group: 'Float' }]
    expect(heatFor(heat, { check: 'c' }, named)).toEqual([0, 5])
    expect(heatFor(heat, { group: 'Logic' }, named)).toEqual([3, 2])
    expect(heatFor(undefined, null, named)).toEqual([])
  })
})

describe('worstSort', () => {
  it('puts the most float first for high float, the most negative first for negative float, else the most failed checks', () => {
    expect(worstSort('high-float')).toEqual({ by: 'float', up: false })
    expect(worstSort('negative-float')).toEqual({ by: 'float', up: true })
    expect(worstSort('leads')).toEqual({ by: 'fails', up: false })
  })
})

describe('shade', () => {
  it('steps up with the share flagged, and is 0 for none', () => {
    expect([0, 0.04, 0.1, 0.3, 0.9].map(shade)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('byFile', () => {
  const up = (file_name: string, uploaded_at: string): UploadSummary => ({ upload_id: file_name + uploaded_at, uploaded_at, file_name, status: 'ready', failure_reason: null, checked: 1, flags: 0 })
  it('groups repeat uploads under their file, keeping the newest first and the files in order of their newest', () => {
    const groups = byFile([up('a.xer', '3'), up('b.xer', '2'), up('a.xer', '1')])
    expect(groups.map((g) => [g.name, g.uploads.map((u) => u.uploaded_at)])).toEqual([['a.xer', ['3', '1']], ['b.xer', ['2']]])
  })
})
