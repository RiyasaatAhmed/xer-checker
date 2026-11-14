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

  it('leads with what needs attention after an upload', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    expect(await screen.findByRole('heading', { level: 1, name: 'CSTv2.4.xer' })).toBeInTheDocument()
    const brief = screen.getByRole('region', { name: 'What needs attention' })
    expect(within(brief).getByText('2 of 3 checks over the limit')).toBeInTheDocument()
    expect(within(brief).getByRole('heading', { name: 'Missing links: 20 of 133 activities (15.0%)' })).toBeInTheDocument()
    expect(within(brief).getByRole('heading', { name: 'High float: 78 of 133 activities (58.6%)' })).toBeInTheDocument()
    expect(within(brief).queryByText(/Negative float/)).not.toBeInTheDocument() // within its limit: not an item
  })

  it('shows each check with its figure, its DCMA section and its limit', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const band = await screen.findByRole('region', { name: 'DCMA checks' })
    const missing = within(band).getByRole('button', { name: /Missing links/ })
    expect(missing).toHaveTextContent('DCMA 4.1')
    expect(missing).toHaveTextContent('15.0%')
    expect(missing).toHaveTextContent('20 of 133 activities')
    expect(missing).toHaveTextContent('Over the 5% limit')
    expect(within(band).getByRole('button', { name: /Negative float/ })).toHaveTextContent('Within the 0% limit')
  })

  it('lists the activities behind the first flag, then the check you pick', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const list = () => screen.getByRole('region', { name: /: \d+ activit/ })
    expect(await screen.findByRole('heading', { name: 'Missing links: 20 activities' })).toBeInTheDocument()
    expect(within(list()).getAllByText('ContractNo_CAL01').length).toBeGreaterThan(0)

    await user().click(screen.getByRole('button', { name: 'Show the 78 activities' }))
    expect(screen.getByRole('heading', { name: 'High float: 78 activities' })).toBeInTheDocument()
    expect(within(list()).getAllByText('ContractNo_U350').length).toBeGreaterThan(0)
  })

  it('filters the activity IDs and copies them all, one per line', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const u = user() // installs its own clipboard, which the test then watches
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    await screen.findByRole('heading', { name: 'Missing links: 20 activities' })
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

  it('shows the project dates and how the forecast sits against the deadline', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const dates = await screen.findByRole('region', { name: 'Project dates' })
    expect(within(dates).getByText('CSTv2.4')).toBeInTheDocument()
    expect(within(dates).getByText('20 Oct 2027')).toBeInTheDocument() // forecast finish
    expect(within(dates).getByText('Forecast to finish 10 days before the deadline.')).toBeInTheDocument()
  })

  it('shows each flagged activity with its name, WBS, links and float, and sorts by float', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const list = await screen.findByRole('region', { name: /Missing links: 20 activities/ })
    expect(within(list).getByText('Calendar placeholder 1')).toBeInTheDocument()
    expect(within(list).getAllByText('Utility Notifications & Meetings')).toHaveLength(2)
    expect(within(list).getByRole('button', { name: /ContractNo_CAL01: 0 before, 1 after/ })).toBeInTheDocument()

    await user().click(within(list).getByRole('button', { name: 'Float (d)' })) // largest first
    const firstRow = within(list).getAllByRole('row')[1]
    expect(firstRow).toHaveTextContent('ContractNo_CAL03')
    expect(firstRow).toHaveTextContent('60.0')
  })

  it('counts what is in the file, and links a flagged float band to its activities', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const overview = await screen.findByRole('region', { name: 'What’s in the file' })
    expect(within(overview).getByText('194')).toBeInTheDocument() // links
    expect(within(overview).getByText('85.6% finish to start')).toBeInTheDocument()
    expect(within(overview).getByText(/4 pairs are linked twice/)).toBeInTheDocument()

    await user().click(within(overview).getByRole('button', { name: 'High float: over the limit' }))
    expect(screen.getByRole('heading', { name: 'High float: 78 activities' })).toBeInTheDocument()
  })

  it('draws the WBS groups with their flagged counts, and opens a group to show what is in it', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const map = await screen.findByRole('region', { name: 'Schedule map' })
    const rows = () => within(map).getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows()).toEqual([expect.stringContaining('Utility3 / 40'), expect.stringContaining('Placeholder20 / 20')]) // the root is skipped
    await user().click(within(map).getByRole('button', { name: 'Expand Utility' }))
    expect(rows()[1]).toContain('Utility Notifications & Meetings')
    expect(within(map).getByText(/Forecast finish/)).toBeInTheDocument() // the legend names the marked dates
  })

  it('picks a group on the map to list only its activities, and clears it again', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const map = await screen.findByRole('region', { name: 'Schedule map' })
    await user().click(within(map).getByRole('button', { name: 'Expand Utility' }))
    await user().click(within(map).getByRole('button', { name: /^Utility Notifications & Meetings/ }))
    const list = screen.getByRole('region', { name: /: \d+ activit/ })
    expect(within(list).getByText(/In Utility Notifications & Meetings: 2 activities/)).toBeInTheDocument()
    await user().click(within(list).getByRole('button', { name: 'Show every group again' }))
    expect(within(list).queryByText(/In Utility Notifications/)).not.toBeInTheDocument()
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
