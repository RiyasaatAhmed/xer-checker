import { describe, expect, it } from 'vitest'
import { progressOf, statusAge, trustOf, verdictLine } from './glance'
import { CST_RESULT } from './test-data'

describe('trustOf', () => {
  it('calls the results partial when any row is broken', () => {
    expect(trustOf({ broken_rows: [], notes: [] })).toEqual({ broken: 0, blanks: 0, partial: false })
    expect(trustOf({ broken_rows: [{ line: 12, message: 'x' }], notes: [{ line: 17, message: 'y' }] })).toEqual({ broken: 1, blanks: 1, partial: true })
  })
  it('does not call rows read with blanks partial: their values were read', () => {
    expect(trustOf({ broken_rows: [], notes: [{ line: 17, message: 'y' }] }).partial).toBe(false)
  })
})

describe('progressOf', () => {
  it('gives the share complete and the count in progress', () => {
    const overview = { ...CST_RESULT.overview!, activities: 435, by_status: [
      { key: 'TK_NotStart', label: 'Not started', count: 385, percent: 88.5 },
      { key: 'TK_Active', label: 'In progress', count: 29, percent: 6.7 },
      { key: 'TK_Complete', label: 'Complete', count: 21, percent: 4.8 },
    ] }
    const progress = progressOf(overview)
    expect(progress?.percent).toBeCloseTo(4.83)
    expect(progress?.active).toBe(29)
  })
  it('has none without an overview', () => {
    expect(progressOf(null)).toBeNull()
  })
})

describe('statusAge', () => {
  it('counts calendar days from the data date to the upload', () => {
    expect(statusAge('2026-07-03T00:00:00', '2026-11-14T12:00:00Z')).toBe(134) // midday: the same date in any time zone
    expect(statusAge(null, '2026-11-14T12:00:00Z')).toBeNull()
  })
})

describe('verdictLine', () => {
  it('says the checks, the serious ones, the finish against the must-finish date, and the data date', () => {
    expect(verdictLine(CST_RESULT, CST_RESULT.projects![0])).toBe(
      'CSTv2.4: 3 of 8 checks over the limit (2 serious). Finish 20 Oct 2027, 10 days before the must-finish date. Data date 1 Jan 2026.',
    )
  })
  it('leaves out what the file does not have', () => {
    const bare = { name: 'P', data_date: null, deadline: null, forecast_finish: '2027-10-20T16:00:00' }
    expect(verdictLine({ file_name: 'a.xer', rules: [] }, bare)).toBe('P: No check could run. Finish 20 Oct 2027.')
  })
})
