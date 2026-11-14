import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { CST_RESULT, UPLOAD_LIST, fakeBackend, reply } from './test-data'

// The Stageshow demo needs a real browser's observers; the page's own behavior doesn't depend on it.
vi.mock('./components/HeroDemo', () => ({ HeroDemo: () => null }))

beforeEach(() => window.history.replaceState(null, '', '/'))
afterEach(() => vi.unstubAllGlobals())

const user = () => userEvent.setup({ applyAccept: false }) // so a wrong file type reaches the app's own check

/** Render the page and upload one file; the fake backend answers the upload with `upload()`. */
async function uploadWith(upload: () => Response, name = 'CSTv2.4.xer') {
  const fetch = fakeBackend(upload)
  vi.stubGlobal('fetch', fetch)
  render(<App />)
  const [input] = await screen.findAllByTestId('file-input') // the home page shows once its list has loaded
  await user().upload(input, new File(['ERMHDR'], name))
  return fetch
}

describe('App', () => {
  it('with no checks yet, shows the demo and one upload button', async () => {
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT)))
    render(<App />)
    expect(await screen.findByRole('region', { name: 'Upload a schedule' })).toBeInTheDocument()
    expect(screen.getByText(/Or drop a .xer file anywhere on this page/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Upload a .xer file' })).toHaveLength(1) // not repeated in the header
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument() // no headline copy
  })

  it('with saved checks, shows the list and the upload button instead of the demo', async () => {
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT), UPLOAD_LIST))
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Recent checks' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Upload a schedule' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Upload a .xer file' })).toHaveLength(1)
  })

  it('shows nothing, not the demo, while the list loads', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))) // never answers
    render(<App />)
    expect(screen.queryByRole('region', { name: 'Upload a schedule' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('a check has an All checks link back to the list, and an upload button in the header', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    await screen.findByRole('heading', { level: 1, name: 'CSTv2.4.xer' })
    expect(screen.getByRole('button', { name: 'Upload a .xer file' })).toBeInTheDocument()
    await user().click(screen.getByRole('link', { name: '← All checks' }))
    expect(window.location.pathname).toBe('/')
    expect(await screen.findByRole('region', { name: 'Upload a schedule' })).toBeInTheDocument()
  })

  it('opens with the file, what was checked and whether every row was read, and no wall of text', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const title = (await screen.findByRole('heading', { level: 1, name: 'CSTv2.4.xer' })).parentElement!
    expect(title).toHaveTextContent('133 activities checked')
    expect(title).toHaveTextContent('0 broken rows')
    expect(title).toHaveTextContent('CSTv2.4')
    expect(screen.queryByText('What needs attention')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'File issues' })).not.toBeInTheDocument() // nothing to show: no card
  })

  it('shows the 3 checks first: a value against its limit, with an icon and a word for the status', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const checks = await screen.findByRole('region', { name: 'DCMA checks' })
    const missing = within(checks).getByRole('button', { name: /Missing links/ })
    expect(missing).toHaveTextContent('15.0%')
    expect(missing).toHaveTextContent('20 of 133')
    expect(missing).toHaveTextContent('limit 5%')
    expect(missing).toHaveTextContent('Over the limit') // for screen readers: the icon is the sign
    expect(missing).toHaveAttribute('title', expect.stringContaining('DCMA 4.1'))
    expect(within(checks).getByRole('button', { name: /Negative float/ })).toHaveTextContent('Within the limit')
  })

  it('lists the activities behind the first flag, then the check you pick', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const list = () => screen.getByRole('region', { name: /: \d+ activit/ })
    expect(await screen.findByRole('region', { name: 'Missing links: 20 activities' })).toBeInTheDocument()
    expect(within(list()).getAllByText('ContractNo_CAL01').length).toBeGreaterThan(0)

    await user().click(within(screen.getByRole('region', { name: 'DCMA checks' })).getByRole('button', { name: /High float/ }))
    expect(screen.getByRole('region', { name: 'High float: 78 activities' })).toBeInTheDocument()
    expect(within(list()).getAllByText('ContractNo_U350').length).toBeGreaterThan(0)
  })

  it('filters the activity IDs and copies them all, one per line', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const u = user() // installs its own clipboard, which the test then watches
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    await screen.findByRole('region', { name: 'Missing links: 20 activities' })
    await u.type(screen.getByRole('searchbox', { name: 'Filter by activity ID, name or WBS' }), 'cal03')
    const list = screen.getByRole('region', { name: /: \d+ activit/ })
    expect(within(list).queryAllByText('ContractNo_CAL01')).toHaveLength(0)
    expect(within(list).getAllByText('ContractNo_CAL03').length).toBeGreaterThan(0)

    await u.click(within(list).getByRole('button', { name: 'Copy IDs' }))
    expect(writeText).toHaveBeenCalledWith('ContractNo_CAL01\nContractNo_CAL03')
    expect(within(list).getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('gives each check its own address, so refresh and Back work', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    await screen.findByRole('heading', { level: 1, name: 'CSTv2.4.xer' })
    expect(window.location.pathname).toBe(`/uploads/${CST_RESULT.upload_id}`)
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

  it('lists recent checks, and opens a saved one at its own address', async () => {
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT), UPLOAD_LIST))
    render(<App />)
    const recent = await screen.findByRole('region', { name: 'Recent checks' })
    expect(within(recent).getByText('Couldn’t be checked: the file is empty')).toBeInTheDocument()

    vi.mocked(window.scrollTo).mockClear()
    await user().click(within(recent).getByRole('link', { name: 'CSTv2.4.xer' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'CSTv2.4.xer' })).toBeInTheDocument()
    expect(window.location.pathname).toBe(`/uploads/${CST_RESULT.upload_id}`)
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0 }) // the check opens at its top, not at the list
  })

  it('says on the map how the forecast sits against the deadline, and labels the key dates on its axis', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const map = await screen.findByRole('region', { name: 'Schedule map' })
    expect(within(map).getByText('10 days before the deadline')).toBeInTheDocument()
    expect(within(map).getByText('Forecast 20 Oct 2027')).toBeInTheDocument()
    expect(within(map).getByText('Data date 1 Jan 2026')).toBeInTheDocument()
    expect(within(map).getByText('Deadline 30 Oct 2027')).toBeInTheDocument()
  })

  it('shows each flagged activity with its name, WBS, links, float and dates, and sorts by float', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const list = await screen.findByRole('region', { name: /Missing links: 20 activities/ })
    expect(within(list).getByText('Calendar placeholder 1')).toBeInTheDocument()
    expect(within(list).getAllByText('Utility Notifications & Meetings')).toHaveLength(2)
    expect(within(list).getAllByText('22 Jan – 20 Feb 2026')).toHaveLength(2)
    expect(within(list).getByRole('button', { name: /ContractNo_CAL01: 0 before, 1 after/ })).toBeInTheDocument()

    await user().click(within(list).getByRole('button', { name: 'Float (days)' })) // largest first
    const firstRow = within(list).getAllByRole('row')[1]
    expect(firstRow).toHaveTextContent('ContractNo_CAL03')
    expect(firstRow).toHaveTextContent('60.0')
  })

  it('profiles the file in one card, and links a flagged float band to its activities', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const profile = await screen.findByRole('region', { name: 'File profile' })
    expect(within(profile).getByText('194')).toBeInTheDocument() // links
    expect(within(profile).getByLabelText(/4 pairs of activities are linked twice/)).toBeInTheDocument()
    expect(within(profile).getByText('145', { selector: 'b' })).toBeInTheDocument() // activities

    await user().click(within(profile).getByRole('button', { name: /Over 44 days/ }))
    expect(screen.getByRole('region', { name: 'High float: 78 activities' })).toBeInTheDocument()
  })

  it('draws the WBS groups with their flagged counts, and opens a group to show what is in it', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const map = await screen.findByRole('region', { name: 'Schedule map' })
    const rows = () => within(map).getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows()).toEqual([expect.stringContaining('Utility3 / 40'), expect.stringContaining('Placeholder20 / 20')]) // the root is skipped
    await user().click(within(map).getByRole('button', { name: 'Expand Utility' }))
    expect(rows()[1]).toContain('Utility Notifications & Meetings')
  })

  it('picks a group on the map to list only its activities, and clears it again', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const map = await screen.findByRole('region', { name: 'Schedule map' })
    await user().click(within(map).getByRole('button', { name: 'Expand Utility' }))
    await user().click(within(map).getByRole('button', { name: /^Utility Notifications & Meetings/ }))
    const list = screen.getByRole('region', { name: /: \d+ activit/ })
    expect(within(list).getByText(/Utility Notifications & Meetings: 2/)).toBeInTheDocument() // the chip: the group and its count
    await user().click(within(list).getByRole('button', { name: 'Show every group again' }))
    expect(within(list).queryByText(/Utility Notifications & Meetings: /)).not.toBeInTheDocument()
  })

  it('shows the logic around an activity, with an empty box where a link is missing', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const list = await screen.findByRole('region', { name: /Missing links: 20 activities/ })
    await user().click(within(list).getByRole('button', { name: /ContractNo_CAL01: 0 before, 1 after/ }))
    const logic = within(list).getByLabelText('Logic around ContractNo_CAL01')
    expect(within(logic).getByText('Nothing before it')).toBeInTheDocument() // the missing link
    expect(within(logic).getByText('Next activity')).toBeInTheDocument()
    expect(within(logic).getByText('FS +16 h')).toBeInTheDocument() // a lag
  })

  it('folds the summary away, so the picture comes first', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const summary = (await screen.findByText('Summary')).closest('details')!
    expect(summary).not.toHaveAttribute('open')
  })

  it('opens the check in the address bar when the page loads', async () => {
    window.history.replaceState(null, '', `/uploads/${CST_RESULT.upload_id}`)
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT), UPLOAD_LIST))
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'CSTv2.4.xer' })).toBeInTheDocument()
  })
})
