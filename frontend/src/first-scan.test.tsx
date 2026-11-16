// The first scan: trust, weight, the driving path, progress and the age of the status, on the page itself.

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { CST_RESULT, fakeBackend, reply } from './test-data'
import type { CheckResult } from './types'

vi.mock('./components/HeroDemo', () => ({ HeroDemo: () => null }))

beforeEach(() => window.history.replaceState(null, '', `/report/${CST_RESULT.upload_id}`))
afterEach(() => vi.unstubAllGlobals())

/** Open one saved result, as the address bar names it. */
async function open(result: CheckResult = CST_RESULT) {
  vi.stubGlobal('fetch', fakeBackend(() => reply(200, result), [], result))
  render(<App />)
  return screen.findByRole('region', { name: 'Verdict' })
}

const WITH_PATH: CheckResult = { ...CST_RESULT, overview: { ...CST_RESULT.overview!, lowest_float: 6.0021, driving_count: 13, driving_wbs: 'Work Package 49548' } }
const BROKEN: CheckResult = { ...CST_RESULT, checked: 4, broken_rows: [{ line: 12, message: "TASK total float 'TBD' is not a number" }], notes: [{ line: 17, message: 'TASK row ends early' }] }

describe('first scan', () => {
  it('says the file read cleanly, how many checks are over the limit and how many are serious, and lists them once', async () => {
    const verdict = await open()
    expect(verdict).toHaveTextContent('File reads cleanly · 145 activities read')
    expect(verdict).toHaveTextContent('2 serious')
    expect(verdict).toHaveTextContent('1 minor')
    expect(within(verdict).queryByRole('group', { name: 'Checks over the limit' })).not.toBeInTheDocument() // the board lists them, not the verdict too
    expect(screen.getAllByRole('button', { name: /^Missing links, / })).toHaveLength(1)
  })

  it('draws every check on one axis of the activities checked, a limit of 0 too', async () => {
    const lead = { ...CST_RESULT, rules: CST_RESULT.rules.map((r) => (r.id === 'leads' ? { ...r, status: 'flag' as const, count: 1, percent: 0.8 } : r)) }
    await open(lead)
    const board = screen.getByRole('region', { name: 'Checks' })
    expect(board).toHaveTextContent('% of 133 activities checked')
    const fill = (name: RegExp) => within(board).getByRole('button', { name }).querySelector<HTMLElement>('.crow-fill')?.style.width
    expect(fill(/^High float, /)).toBe('58.6%')
    expect(fill(/^Leads, /)).toBe('0.8%') // none allowed, and still a bar
  })

  it('draws a bar per set of checks on the board\'s axis, says why a set can\'t run, and filters the rows to a set on a click', async () => {
    await open()
    const board = screen.getByRole('region', { name: 'Checks' })
    const sets = within(board).getByRole('group', { name: 'Activities flagged, by set of checks' })
    const logic = within(sets).getByRole('button', { name: 'Logic: 25 activities, 18.8%, 1 of 4 checks over the limit' }) // each activity counted once
    expect(logic.querySelector<HTMLElement>('.crow-fill')?.style.width).toMatch(/^18\.79/)
    expect(within(sets).getByRole('button', { name: /^Constraints: 0 activities, 0\.0%, every check within the limit$/ }).querySelector('.crow-fill')).toBeNull()
    expect(sets).toHaveTextContent('1 check can’t run: The file has no resource assignments.')
    await userEvent.setup().click(logic)
    expect(logic).toHaveAttribute('aria-pressed', 'true')
    expect(within(board).getByText('Logic checks only')).toBeInTheDocument()
  })

  it('puts what is wrong and why it matters in a failing row\'s tooltip, and opens its activities on a click', async () => {
    await open()
    const row = within(screen.getByRole('region', { name: 'Checks' })).getByRole('button', { name: /^Missing links, / })
    expect(row).toHaveAttribute('data-tip', 'DCMA 4.1. 20 activities are missing a link before or after them. Work with an open end can slip without moving the finish date.')
    await userEvent.setup().click(row)
    expect(window.location.pathname).toBe(`/report/${CST_RESULT.upload_id}/checks/missing-links`)
  })

  it('opens an older /uploads link as the report, and moves the address to /report', async () => {
    window.history.replaceState(null, '', `/uploads/${CST_RESULT.upload_id}/checks/high-float`)
    await open()
    expect(window.location.pathname).toBe(`/report/${CST_RESULT.upload_id}/checks/high-float`)
    expect(await screen.findByRole('region', { name: /^High float: / })).toBeInTheDocument()
  })

  it('says what to do in P6 above the activities of a check', async () => {
    await open()
    const list = await screen.findByRole('region', { name: 'Missing links: 20 activities' })
    expect(await within(list).findByText('Add the missing link in P6, then re-export.')).toBeInTheDocument()
  })

  it('leads with partial results when rows are broken, and opens them under the verdict', async () => {
    const verdict = await open(BROKEN)
    const trust = within(verdict).getByRole('button', { name: /1 broken row/ })
    expect(trust).toHaveTextContent('1 broken row · 1 row read with blanks · only 4 checked · results may be partial')
    const issues = document.getElementById('file-issues') as HTMLDetailsElement
    expect(issues.open).toBe(false)
    await userEvent.setup().click(trust)
    expect(issues.open).toBe(true)
    expect(within(issues).getByText("TASK total float 'TBD' is not a number")).toBeInTheDocument()
  })

  it('shows a count, not a share, when few activities were checked', async () => {
    await open(BROKEN)
    const board = screen.getByRole('region', { name: 'Checks' })
    expect(within(board).getByRole('button', { name: /^Missing links, 20 of 4/ })).toBeInTheDocument()
  })

  it('names the driving path: the activities at the lowest float, and where most of them are', async () => {
    const verdict = await open(WITH_PATH)
    expect(verdict).toHaveTextContent('Driving path: 13 activities at 6.0 d float, most in Work Package 49548')
  })

  it('puts the finish date first when there is no deadline, and says the progress', async () => {
    const noDeadline = { ...CST_RESULT, projects: [{ ...CST_RESULT.projects![0], deadline: null }] }
    const verdict = await open(noDeadline)
    expect(verdict).toHaveTextContent('Finish 20 Oct 2027')
    expect(verdict).toHaveTextContent('No must-finish date in the file')
    expect(verdict).toHaveTextContent('0 of 145 activities complete · 0 in progress') // a count, not a % that reads like % complete by duration
  })

  it('shows the data date and its age in the header', async () => {
    await open()
    expect(screen.getByText(/Data date 1 Jan 2026/, { selector: '.meta-date' })).toHaveTextContent(/^Data date 1 Jan 2026 · 31\d days before upload$/) // 317, give or take the time zone
  })

  it('splits failing checks into serious and minor, and marks a serious one', async () => {
    await open()
    const board = screen.getByRole('region', { name: 'Checks' })
    expect(within(board).getByRole('heading', { name: /^Serious/ })).toHaveTextContent('2')
    expect(within(board).getByRole('heading', { name: /^Minor/ })).toHaveTextContent('1')
    expect(within(board).getByRole('button', { name: /^High float, 58\.6%, over the limit, 11\.7 times the limit, serious$/ })).toBeInTheDocument()
  })

  it('names a check by the problem it finds, and counts leads and lags as links too', async () => {
    const result = { ...CST_RESULT, rules: CST_RESULT.rules.map((r) => (r.id === 'lags' ? { ...r, status: 'flag' as const, count: 1, percent: 6 } : r)) }
    await open(result)
    const board = screen.getByRole('region', { name: 'Checks' })
    expect(within(board).getByRole('button', { name: /^Lags,/ })).toHaveTextContent('1 activity (1 lag)')
    await userEvent.setup().click(within(board).getByRole('button', { name: /Can’t be checked/ }))
    expect(within(board).getByText('No resources')).toBeInTheDocument()
  })

  it('shows the activities that fail the most checks as a grid, and lists one picked in Fix first, filtered to its ID', async () => {
    const result = { ...CST_RESULT, fix_first: { ...CST_RESULT.fix_first!, repeat_offenders: [{ ...CST_RESULT.fix_first!.repeat_offenders[0], checks: ['missing-links', 'long-durations'] }] } }
    await open(result)
    const fix = screen.getByRole('region', { name: 'Fix first' })
    const grid = within(fix).getByRole('table', { name: 'Activities that fail the most checks' })
    expect(within(grid).getAllByRole('rowheader').map((h) => h.textContent)).toEqual(['Missing links', 'Long durations', 'Checks failed'])
    expect(within(grid).getByRole('img', { name: 'ContractNo_CAL01 fails Long durations' })).toBeInTheDocument()
    await userEvent.setup().click(within(fix).getByRole('button', { name: 'ContractNo_CAL03' }))
    expect(await screen.findByDisplayValue('ContractNo_CAL03')).toHaveAccessibleName('Filter by activity ID, name or WBS')
    expect(screen.getByRole('region', { name: 'Missing links: 20 activities' })).toBeInTheDocument()
  })

  it('lets you pick the project when the file holds more than one', async () => {
    const two = { ...CST_RESULT, projects: [CST_RESULT.projects![0], { ...CST_RESULT.projects![0], name: 'PRJ-B', deadline: null }] }
    await open(two)
    expect(screen.getByRole('heading', { level: 1, name: 'CSTv2.4' })).toBeInTheDocument()
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Project' }), '1')
    expect(screen.getByRole('heading', { level: 1, name: 'PRJ-B' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Verdict' })).toHaveTextContent('No must-finish date in the file')
  })

  it('gives the verdict as one line to copy', async () => {
    await open()
    expect(screen.getByRole('region', { name: 'Summary' })).toHaveTextContent('CSTv2.4: 3 of 8 checks over the limit (2 serious).')
  })
})
