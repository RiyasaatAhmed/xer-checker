import { describe, expect, it } from 'vitest'
import { countText, csvText, percentText, rangeText } from './format'
import { pathFor, routeIn, uploadIdIn } from './route'
import { ruleText } from './rules'
import { fileProblem } from './validate'

const ID = '11111111-1111-4111-8111-111111111111'

describe('format', () => {
  it('writes percents with 1 decimal and counts with their noun', () => {
    expect(percentText(15)).toBe('15.0%')
    expect(percentText(0.025, 1)).toBe('<0.1%') // 1 of 3,973: above 0, so never "0.0%"
    expect(percentText(0, 0)).toBe('0.0%')
    expect([countText(1, 'row'), countText(7, 'row'), countText(2, 'activity', 'activities')]).toEqual(['1 row', '7 rows', '2 activities'])
  })

  it('quotes CSV values that hold a comma or a quote', () => {
    expect(csvText(['Check', 'Activity ID'], [['High float', 'A,1'], ['High float', 'say "hi"']])).toBe(
      'Check,Activity ID\nHigh float,"A,1"\nHigh float,"say ""hi"""\n',
    )
  })

  it('keeps a CSV value that looks like a formula as text, and a negative number as a number', () => {
    expect(csvText(['Name', 'Float'], [['=HYPERLINK("x")', '-3.5'], ['@SUM(A1)', '+1']])).toBe(
      `Name,Float\n"'=HYPERLINK(""x"")",-3.5\n'@SUM(A1),+1\n`,
    )
  })
})

describe('rangeText', () => {
  it('shows the year once when both dates share it, and both when they do not', () => {
    expect(rangeText('2026-01-22T08:00:00', '2026-02-20T16:00:00')).toBe('22 Jan – 20 Feb 2026')
    expect(rangeText('2026-11-30T08:00:00', '2027-02-20T16:00:00')).toBe('30 Nov 2026 – 20 Feb 2027')
    expect(rangeText(null, null)).toBe('–')
  })
})

describe('route', () => {
  it('reads an upload ID from its path, and nothing else', () => {
    expect(uploadIdIn(`/uploads/${ID}`)).toBe(ID)
    expect(uploadIdIn('/')).toBeNull()
    expect(uploadIdIn('/uploads/not-an-id')).toBeNull()
    expect([pathFor(ID), pathFor(null)]).toEqual([`/uploads/${ID}`, '/'])
  })

  it('reads a check from its path too, and writes one', () => {
    expect(routeIn(`/uploads/${ID}/checks/high-float`)).toEqual({ uploadId: ID, checkId: 'high-float' })
    expect(routeIn(`/uploads/${ID}`)).toEqual({ uploadId: ID, checkId: null })
    expect(routeIn(`/uploads/${ID}/checks/`)).toEqual({ uploadId: null, checkId: null })
    expect(pathFor(ID, 'leads')).toBe(`/uploads/${ID}/checks/leads`)
    expect(pathFor(null, 'leads')).toBe('/')
  })
})

describe('validate', () => {
  it('takes a .xer in any case, and refuses other types and files over 50 MB', () => {
    expect(fileProblem(new File(['x'], 'plan.XER'))).toBeNull()
    expect(fileProblem(new File(['x'], 'plan.xml'))).toMatch("isn't a .xer file")
    const big = new File(['x'], 'big.xer')
    Object.defineProperty(big, 'size', { value: 51 * 1024 * 1024 })
    expect(fileProblem(big)).toMatch('over 50 MB')
  })
})

describe('rules', () => {
  it('has plain words for every check by its ID, and for one it does not know yet', () => {
    expect(ruleText('high-float').short).toBe('More than 44 working days of spare time')
    expect(ruleText('hard-constraints').action).toBe('Replace each with logic, or a soft constraint.')
    expect(ruleText('a-new-check').action).toBe('Review them in P6.')
  })
})
