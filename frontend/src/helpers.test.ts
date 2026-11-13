import { describe, expect, it } from 'vitest'
import { countText, csvText, percentText } from './format'
import { pathFor, uploadIdIn } from './route'
import { ruleText } from './rules'
import { fileProblem } from './validate'

const ID = '11111111-1111-4111-8111-111111111111'

describe('format', () => {
  it('writes percents with 1 decimal and counts with their noun', () => {
    expect(percentText(15)).toBe('15.0%')
    expect([countText(1, 'row'), countText(7, 'row'), countText(2, 'activity', 'activities')]).toEqual(['1 row', '7 rows', '2 activities'])
  })

  it('quotes CSV values that hold a comma or a quote', () => {
    expect(csvText(['Check', 'Activity ID'], [['High float', 'A,1'], ['High float', 'say "hi"']])).toBe(
      'Check,Activity ID\nHigh float,"A,1"\nHigh float,"say ""hi"""\n',
    )
  })
})

describe('route', () => {
  it('reads an upload ID from its path, and nothing else', () => {
    expect(uploadIdIn(`/uploads/${ID}`)).toBe(ID)
    expect(uploadIdIn('/')).toBeNull()
    expect(uploadIdIn('/uploads/not-an-id')).toBeNull()
    expect([pathFor(ID), pathFor(null)]).toEqual([`/uploads/${ID}`, '/'])
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
  it('has plain words for every check, and for one it does not know yet', () => {
    expect(ruleText('High float').short).toBe('More than 44 working days of spare time')
    expect(ruleText('Hard constraints').action).toBe('Review them in P6.')
  })
})
