import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { CST_CHECKS, CST_RESULT, SMALL_RESULT, UPLOAD_LIST, fakeBackend, manyMissing, reply } from './test-data'

// The Stageshow demo needs a real browser's observers; the page's own behavior doesn't depend on it.
vi.mock('./components/HeroDemo', () => ({ HeroDemo: () => null }))

beforeEach(() => window.history.replaceState(null, '', '/'))
afterEach(() => vi.unstubAllGlobals())

/** The elements under `root` that carry this tooltip text. */
const tipped = (root: HTMLElement, text: string) => Array.from(root.querySelectorAll<HTMLElement>('[data-tip]')).filter((e) => e.getAttribute('data-tip') === text)

const user = () => userEvent.setup({ applyAccept: false }) // so a wrong file type reaches the app's own check

/** Render the page and upload one file; the fake backend answers the upload with `upload()`. */
async function uploadWith(upload: () => Response, name = 'CSTv2.4.xer', backend: ReturnType<typeof fakeBackend> = fakeBackend(upload)) {
  const fetch = backend
  vi.stubGlobal('fetch', fetch)
  render(<App />)
  const [input] = await screen.findAllByTestId('file-input') // the home page shows once its list has loaded
  await user().upload(input, new File(['ERMHDR'], name))
  return fetch
}

describe('App', () => {
  it('with no schedules yet, shows the demo and one upload button', async () => {
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT)))
    render(<App />)
    expect(await screen.findByRole('region', { name: 'Upload a schedule' })).toBeInTheDocument()
    expect(screen.getByText(/Or drop a .xer file anywhere on this page/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Upload a .xer file' })).toHaveLength(1) // not repeated in the header
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument() // no headline copy
  })

  it('with saved schedules, shows the list and the upload button instead of the demo', async () => {
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT), UPLOAD_LIST))
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Recent schedules' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Upload a schedule' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Upload a .xer file' })).toHaveLength(1)
  })

  it('answers in the verdict: how many checks are over, the worst ones, the finish against the deadline, and what changed', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const verdict = await screen.findByRole('region', { name: 'Verdict' })
    expect(verdict).toHaveTextContent('3 of 8 checks over the limit') // 8 could run; 2 could not
    expect(verdict).toHaveTextContent('10 days early')
    expect(verdict).toHaveTextContent('Deadline 30 Oct 2027')
    expect(verdict).toHaveTextContent('2 better than the last upload')
    expect(within(verdict).getAllByRole('button').map((b) => b.textContent)).toEqual(['Missing links', 'High float', 'Long durations']) // the most serious first
  })

  it('says no check could run, not that all are within the limit, when nothing was checked', async () => {
    const nothing = { ...CST_RESULT, checked: 0, rules: CST_RESULT.rules.map((r) => ({ ...r, count: 0, percent: 0, status: 'n/a' as const })) }
    await uploadWith(() => reply(200, nothing))
    const verdict = await screen.findByRole('region', { name: 'Verdict' })
    expect(verdict).toHaveTextContent('No check could run')
    expect(verdict).not.toHaveTextContent('within the limit')
  })

  it('shows all the checks as a strip, and only the failing ones as rows, with the rest folded away', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const board = await screen.findByRole('region', { name: 'Checks' })
    expect(within(board).getAllByRole('button', { name: /: (over the limit|within the limit|can't be checked)$/ })).toHaveLength(10) // one cell each
    expect(within(board).getByRole('heading', { name: /Needs attention/ })).toHaveTextContent('3')
    expect(within(board).getAllByRole('button', { name: /, \d+\.\d%, over the limit/ })).toHaveLength(3)
    expect(within(board).queryByRole('button', { name: /^Leads,/ })).not.toBeInTheDocument() // folded

    await user().click(within(board).getByRole('button', { name: /Within the limit/ }))
    expect(within(board).getByRole('button', { name: /^Leads, 0\.0%, within the limit/ })).toBeInTheDocument()
    await user().click(within(board).getByRole('button', { name: /Can’t be checked/ }))
    expect(within(board).getByText('The file has no resource assignments.')).toBeInTheDocument() // the reason, not a pass
  })

  it('shows every check as a row when there are few', async () => {
    await uploadWith(() => reply(200, SMALL_RESULT), 'CSTv2.4.xer', fakeBackend(() => reply(200, SMALL_RESULT), [], SMALL_RESULT))
    const board = await screen.findByRole('region', { name: 'Checks' })
    expect(within(board).getAllByRole('button', { name: /^(Missing links|Negative float|High float),/ })).toHaveLength(3)
    expect(within(board).queryByRole('heading', { name: /Needs attention/ })).not.toBeInTheDocument()
  })

  it('shows how far over its limit a check is, and the change since the last upload', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const board = await screen.findByRole('region', { name: 'Checks' })
    const high = within(board).getByRole('button', { name: /^High float, 58\.6%/ })
    expect(high).toHaveTextContent('11.7x limit')
    expect(high).toHaveTextContent('better by 3.4') // 62.0 before
    expect(within(board).getByRole('button', { name: /^Long durations, 17\.3%/ })).toHaveTextContent('same')
  })

  it('opens on the worst check, loads only its activities, then the one you pick, at its own address', async () => {
    const backend = fakeBackend(() => reply(200, CST_RESULT))
    await uploadWith(() => reply(200, CST_RESULT), 'CSTv2.4.xer', backend)
    const list = () => screen.getByRole('region', { name: /: \d+ activit/ })
    expect(await screen.findByRole('region', { name: 'Missing links: 20 activities' })).toBeInTheDocument()
    expect((await within(list()).findAllByText('ContractNo_CAL01')).length).toBeGreaterThan(0)
    expect(backend.mock.calls.filter(([url]) => String(url).includes('/checks/')).map(([url]) => url)).toEqual([`/api/uploads/${CST_RESULT.upload_id}/checks/missing-links`])

    await user().click(within(screen.getByRole('region', { name: 'Checks' })).getByRole('button', { name: /^High float, 58\.6%/ }))
    expect(screen.getByRole('region', { name: 'High float: 78 activities' })).toBeInTheDocument()
    expect((await within(list()).findAllByText('ContractNo_U350')).length).toBeGreaterThan(0)
    expect(window.location.pathname).toBe(`/uploads/${CST_RESULT.upload_id}/checks/high-float`)
  })

  it('opens the check named in the address, and the worst one when the address names none that exists', async () => {
    window.history.replaceState(null, '', `/uploads/${CST_RESULT.upload_id}/checks/long-durations`)
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT), UPLOAD_LIST))
    const { unmount } = render(<App />)
    expect(await screen.findByRole('region', { name: 'Long durations: 23 activities' })).toBeInTheDocument()
    unmount()
    window.history.replaceState(null, '', `/uploads/${CST_RESULT.upload_id}/checks/nope`)
    render(<App />)
    expect(await screen.findByRole('region', { name: 'Missing links: 20 activities' })).toBeInTheDocument()
  })

  it('says why a check that cannot run was not run, instead of listing activities', async () => {
    window.history.replaceState(null, '', `/uploads/${CST_RESULT.upload_id}/checks/bei`)
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT), UPLOAD_LIST))
    render(<App />)
    const card = await screen.findByRole('region', { name: "BEI: can't be checked" })
    expect(card).toHaveTextContent('Needs a baseline schedule.')
  })

  it("says so when a check's activities can't be loaded", async () => {
    await uploadWith(() => reply(200, CST_RESULT), 'CSTv2.4.xer', fakeBackend(() => reply(200, CST_RESULT), [], CST_RESULT, {}))
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load the activities.')
  })

  it('filters the activity IDs and copies them all, one per line', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const u = user() // installs its own clipboard, which the test then watches
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    await screen.findByRole('region', { name: 'Missing links: 20 activities' })
    await u.type(await screen.findByRole('searchbox', { name: 'Filter by activity ID, name or WBS' }), 'cal03')
    const list = screen.getByRole('region', { name: /: \d+ activit/ })
    expect(within(list).queryAllByText('ContractNo_CAL01')).toHaveLength(0)
    expect(within(list).getAllByText('ContractNo_CAL03').length).toBeGreaterThan(0)

    await u.click(within(list).getByRole('button', { name: 'Copy IDs' }))
    expect(writeText).toHaveBeenCalledWith('ContractNo_CAL01\nContractNo_CAL03')
    expect(within(list).getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('names the browser tab after the file', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    await screen.findByRole('heading', { level: 1, name: 'CSTv2.4' }) // the project leads; the file name sits under it
    expect(screen.getByText('CSTv2.4.xer')).toBeInTheDocument()
    expect(document.title).toBe('CSTv2.4.xer · XER checker')
  })

  it("shows the backend's reason when a file can't be checked", async () => {
    await uploadWith(() => reply(422, { detail: "can't be checked: the file is empty" }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't be checked: the file is empty.")
    expect(screen.getByRole('button', { name: 'Upload a .xer file' })).toBeInTheDocument() // on the page under the notice
  })

  it('refuses a file that is not a .xer before sending it', async () => {
    const fetch = await uploadWith(() => reply(200, CST_RESULT), 'schedule.pdf')
    expect(screen.getByRole('alert')).toHaveTextContent("schedule.pdf isn't a .xer file")
    expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  it('lists recent schedules with a strip each, and opens a saved one at its own address', async () => {
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT), UPLOAD_LIST))
    render(<App />)
    const recent = await screen.findByRole('region', { name: 'Recent schedules' })
    expect(tipped(recent, 'Couldn’t be checked: the file is empty')[0]).toHaveTextContent('Can’t be read')
    expect(within(recent).getByText('2 serious')).toBeInTheDocument() // missing links and high float
    expect(within(recent).getByText('20 Oct 2027')).toBeInTheDocument() // the finish date, under the gap
    expect(within(recent).getByRole('img', { name: "3 over the limit, 5 within, 2 can't be checked" })).toBeInTheDocument()
    expect(within(recent).getByText('10 days early')).toBeInTheDocument()

    vi.mocked(window.scrollTo).mockClear()
    await user().click(within(recent).getByRole('link', { name: 'CSTv2.4.xer' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'CSTv2.4' })).toBeInTheDocument()
    expect(window.location.pathname).toBe(`/uploads/${CST_RESULT.upload_id}`)
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0 }) // the schedule opens at its top, not at the list
  })

  it('puts repeat uploads of one file under its name, newest first', async () => {
    const older = { ...UPLOAD_LIST[0], upload_id: '44444444-4444-4444-8444-444444444444', uploaded_at: '2026-11-01T03:00:00Z', flags: 5 }
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT), [UPLOAD_LIST[0], older]))
    render(<App />)
    const recent = await screen.findByRole('region', { name: 'Recent schedules' })
    expect(within(recent).getByText('2 uploads, newest first')).toBeInTheDocument()
    expect(within(recent).getAllByText(/over$/).map((e) => e.textContent)).toEqual(['3 over', '5 over'])
  })

  it('labels the key dates on the map axis, and counts the picked check on it', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const map = await screen.findByRole('region', { name: 'Where' })
    expect(within(map).getByText('Forecast 20 Oct 2027')).toBeInTheDocument()
    expect(within(map).getByText('Data date 1 Jan 2026')).toBeInTheDocument()
    expect(within(map).getByText('Deadline 30 Oct 2027')).toBeInTheDocument()
    expect(within(map).getByRole('button', { name: 'Missing links', pressed: true })).toBeInTheDocument() // what it counts
  })

  it('shows each flagged activity with its name, WBS and float, and puts the one failing most checks first', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const list = await screen.findByRole('region', { name: /Missing links: 20 activities/ })
    expect(await within(list).findByText('Calendar placeholder 1')).toBeInTheDocument()
    expect(within(list).getAllByText('Utility Notifications & Meetings')).toHaveLength(2)
    expect(tipped(list, 'Total float 12.0 d. Bar below: 22 Jan – 20 Feb 2026, against the data date 1 Jan 2026')).toHaveLength(1) // float and dates, on hover
    expect(within(list).getByText('fails 3')).toBeInTheDocument() // CAL03 is flagged by 3 checks
    const codes = () => within(list).getAllByText(/^ContractNo_CAL\d+$/).map((e) => e.textContent)
    expect(codes()).toEqual(['ContractNo_CAL03', 'ContractNo_CAL01']) // worst first: most checks failed

    await user().selectOptions(within(list).getByRole('combobox', { name: 'Sort' }), 'file')
    expect(codes()).toEqual(['ContractNo_CAL01', 'ContractNo_CAL03']) // file order
    await user().selectOptions(within(list).getByRole('combobox', { name: 'Sort' }), 'float-desc')
    expect(codes()).toEqual(['ContractNo_CAL03', 'ContractNo_CAL01']) // 60 days before 12
  })

  it('draws float as one bar, and links the spare-time bands to the high float check', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const strip = await screen.findByRole('region', { name: 'Float of the unfinished work' })
    expect(strip).toHaveTextContent('Lowest 0.0 d')
    expect(strip).toHaveTextContent('Over 44 d: 78 of 133 (58.6%), limit 5%')
    await user().click(within(strip).getByRole('button', { name: /45 to 90/ }))
    expect(screen.getByRole('region', { name: 'High float: 78 activities' })).toBeInTheDocument()
  })

  it('profiles the file in one card, and says what the checks leave out', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const profile = await screen.findByRole('region', { name: 'File profile' })
    expect(within(profile).getByText('194')).toBeInTheDocument() // links
    expect(within(profile).getByLabelText(/4 pairs of activities are linked twice/)).toBeInTheDocument()
    expect(within(profile).getByText('145', { selector: 'b' })).toBeInTheDocument() // activities
    expect(within(profile).getByText('Checked and left out')).toBeInTheDocument()
    expect(within(profile).getByText('Level of effort')).toBeInTheDocument()
  })

  it('draws the WBS groups worst first with their flagged counts, and opens a group to show what is in it', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const map = await screen.findByRole('region', { name: 'Where' })
    const rows = () => within(map).getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows()).toEqual([expect.stringContaining('Placeholder20 / 20'), expect.stringContaining('Utility3 / 40')]) // the root is skipped
    await user().click(within(map).getByRole('button', { name: 'Worst first', pressed: true })) // off: file order
    expect(rows()).toEqual([expect.stringContaining('Utility3 / 40'), expect.stringContaining('Placeholder20 / 20')])
    await user().click(within(map).getByRole('button', { name: 'Expand Utility' }))
    expect(rows()[1]).toContain('Utility Notifications & Meetings')
  })

  it('counts all flags together, or one set of checks, when asked', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const map = await screen.findByRole('region', { name: 'Where' })
    await user().click(within(map).getByRole('button', { name: 'All checks' }))
    expect(within(map).getByRole('button', { name: 'All checks', pressed: true })).toBeInTheDocument()
    expect(within(map).getAllByRole('row').slice(1).map((r) => r.textContent)[0]).toContain('Placeholder20 / 20') // each group's flags, all checks
    await user().click(within(screen.getByRole('region', { name: 'Checks' })).getByRole('button', { name: /^Logic/ })) // a set on the strip
    expect(within(map).getByRole('button', { name: 'Logic checks', pressed: true })).toBeInTheDocument()
  })

  it('shows the groups against the sets of checks as a matrix', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const map = await screen.findByRole('region', { name: 'Where' })
    await user().click(within(map).getByRole('button', { name: 'By set of checks' }))
    const matrix = within(map).getByRole('table', { name: /by WBS group and set of checks/ })
    expect(within(matrix).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Group', 'Logic', 'Constraints', 'Float', 'Duration']) // Resources and Execution cannot run
    expect(tipped(matrix, 'Placeholder, Logic: 20 of 20 flagged')[0]).toHaveTextContent('20')
  })

  it('names the one fix that clears the most flags', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const fix = await screen.findByRole('region', { name: 'Fix first' })
    expect(fix).toHaveTextContent('ContractNo_CAL03 has nothing after it.')
    expect(fix).toHaveTextContent('5 flagged activities lead only into it.')
    expect(fix).toHaveTextContent('ContractNo_CAL01 fails 2 checks.')
  })

  it('picks a group on the map to list only its activities, and clears it again', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const map = await screen.findByRole('region', { name: 'Where' })
    await user().click(within(map).getByRole('button', { name: 'Expand Utility' }))
    await user().click(within(map).getByRole('button', { name: /^Utility Notifications & Meetings/ }))
    const list = screen.getByRole('region', { name: /: \d+ activit/ })
    expect(await within(list).findByText(/Utility Notifications & Meetings: 2/)).toBeInTheDocument() // the chip: the group and its count
    await user().click(within(list).getByRole('button', { name: 'Show every group again' }))
    expect(within(list).queryByText(/Utility Notifications & Meetings: /)).not.toBeInTheDocument()
  })

  it('shows each activity on one line with its logic, and a red "none" where a link is missing', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const list = await screen.findByRole('region', { name: /Missing links: 20 activities/ })
    expect(await within(list).findByLabelText('Nothing before it')).toBeInTheDocument() // ContractNo_CAL01 has nothing before it
    expect(within(list).getByLabelText('Nothing after it')).toBeInTheDocument() // ContractNo_CAL03 has nothing after it
    expect(tipped(list, 'Next activity (FS +16 h)')[0]).toHaveTextContent('ContractNo_C100') // a neighbor, with its link and lag
    expect(within(list).getByText('Calendar placeholder 1')).toBeInTheDocument() // the name is on the line: no click needed
  })

  it('groups the activities under their top-level WBS group, tells the kinds apart, and folds a group away', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const list = await screen.findByRole('region', { name: /Missing links: 20 activities/ })
    const head = await within(list).findByRole('button', { name: /^Utility 2/ }) // both sit under Utility
    expect(head).toHaveAttribute('aria-expanded', 'true') // a small result opens by itself
    await user().click(head)
    expect(within(list).queryByText('ContractNo_CAL01')).not.toBeInTheDocument()
    await user().click(within(list).getByRole('button', { name: /^Utility 2/ }))
    expect(within(list).getAllByText('ContractNo_CAL01').length).toBeGreaterThan(0)

    await user().click(within(list).getByRole('button', { name: /Nothing after 1/ })) // only the activities with nothing after them
    expect(within(list).getByRole('button', { name: /^Utility 1/ })).toBeInTheDocument()
    expect(within(list).queryByText('ContractNo_CAL01')).not.toBeInTheDocument()
  })

  it('keeps the page light for any number of activities: the worst 8 first, then all of them in a fixed window', async () => {
    const { result, checks } = manyMissing(5000)
    await uploadWith(() => reply(200, result), 'CSTv2.4.xer', fakeBackend(() => reply(200, result), [], result, checks))
    const list = await screen.findByRole('region', { name: /Missing links: 5,000 activities/ })
    const window = await within(list).findByRole('list', { name: 'Activities' })
    expect(within(window).getAllByRole('listitem')[0]).toHaveAttribute('aria-setsize', '10') // the header, 8 activities and "Show all"
    await user().click(within(window).getByRole('button', { name: /Show all 5,000 in Utility/ }))

    const lines = () => within(window).getAllByRole('listitem')
    expect(lines().length).toBeLessThan(40) // 5,000 activities, about 15 in the page
    expect(lines()[0]).toHaveAttribute('aria-setsize', '5001') // the header and every activity: the list still knows its size
    expect(window).toHaveStyle({ height: '520px' }) // fixed height

    fireEvent.scroll(window, { target: { scrollTop: 40 + 60 * 1000 } }) // deep into the list
    expect(within(window).getByText('A1001')).toBeInTheDocument()
    expect(within(window).queryByText('A1')).not.toBeInTheDocument()
    expect(lines().length).toBeLessThan(40)
    // The group's header is out of sight, so its name is pinned at the top
    expect(within(window).getAllByRole('button', { name: /^Utility 5,000/ })).toHaveLength(1)
  })

  it('lists just the IDs for an older upload that kept nothing else', async () => {
    const older = { ...CST_CHECKS, 'missing-links': { ...CST_CHECKS['missing-links'], details: [] } }
    await uploadWith(() => reply(200, CST_RESULT), 'CSTv2.4.xer', fakeBackend(() => reply(200, CST_RESULT), [], CST_RESULT, older))
    const list = await screen.findByRole('region', { name: /Missing links: 20 activities/ })
    expect(await within(list).findByText('ContractNo_CAL01')).toBeInTheDocument()
    expect(within(list).queryByRole('combobox', { name: 'Sort' })).not.toBeInTheDocument() // nothing to sort by
  })

  it('folds the summary away, so the picture comes first', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const summary = (await screen.findByText('Summary')).closest('details')!
    expect(summary).not.toHaveAttribute('open')
  })

  it('opens the schedule in the address bar when the page loads', async () => {
    window.history.replaceState(null, '', `/uploads/${CST_RESULT.upload_id}`)
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT), UPLOAD_LIST))
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'CSTv2.4' })).toBeInTheDocument()
  })

  it('shows a tooltip on hover after a short delay, with the tooltip layer describing the element, and hides it on Escape', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const board = await screen.findByRole('region', { name: 'Checks' })
    const cell = within(board).getByRole('button', { name: 'Missing links: over the limit' })
    const tip = screen.getByRole('tooltip', { hidden: true })
    expect(tip).not.toHaveAttribute('data-open')

    const u = user()
    await u.hover(cell)
    await waitFor(() => expect(tip).toHaveAttribute('data-open'))
    expect(tip).toHaveTextContent('Missing links: over the limit')
    expect(cell).toHaveAttribute('aria-describedby', tip.id)

    await u.keyboard('{Escape}')
    expect(tip).not.toHaveAttribute('data-open')
    expect(cell).not.toHaveAttribute('aria-describedby')
  })

  it('keeps a tooltip while the pointer is on it, and shows the next one at once after one closes', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const board = await screen.findByRole('region', { name: 'Checks' })
    const [first, second] = within(board).getAllByRole('button', { name: /: (over the limit|within the limit)$/ })
    const tip = screen.getByRole('tooltip', { hidden: true })
    const u = user()
    await u.hover(first)
    await waitFor(() => expect(tip).toHaveAttribute('data-open'))
    await u.hover(tip) // onto the bubble: it stays
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(tip).toHaveAttribute('data-open')
    await u.hover(second) // already warm: no 250 ms wait
    await waitFor(() => expect(tip).toHaveTextContent(second.getAttribute('data-tip') as string), { timeout: 150 })
  })
})
