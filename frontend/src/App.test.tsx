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
  await user().upload(screen.getAllByTestId('file-input')[0], new File(['ERMHDR'], name))
  return fetch
}

describe('App', () => {
  it('starts with what it does and where to drop a file', () => {
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT)))
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Find what’s slowing your schedule down.')
    expect(screen.getByText('Drop a .xer file anywhere on this page')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose a file' })).toBeEnabled()
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
    expect(within(list()).getByText('ContractNo_CAL01')).toBeInTheDocument()

    await user().click(screen.getByRole('button', { name: 'Show the 78 activities' }))
    expect(screen.getByRole('heading', { name: 'High float: 78 activities' })).toBeInTheDocument()
    expect(within(list()).getByText('ContractNo_U350')).toBeInTheDocument()
  })

  it('filters the activity IDs and copies them all, one per line', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const u = user() // installs its own clipboard, which the test then watches
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    await screen.findByRole('heading', { name: 'Missing links: 20 activities' })
    await u.type(screen.getByRole('searchbox', { name: 'Filter by activity ID' }), 'cal03')
    const list = screen.getByRole('region', { name: /: \d+ activit/ })
    expect(within(list).queryByText('ContractNo_CAL01')).not.toBeInTheDocument()
    expect(within(list).getByText('ContractNo_CAL03')).toBeInTheDocument()

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
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't be checked: the file is empty")
    expect(screen.getByRole('button', { name: 'Try another file' })).toBeInTheDocument()
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

    await user().click(within(recent).getByRole('link', { name: 'CSTv2.4.xer' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'CSTv2.4.xer' })).toBeInTheDocument()
    expect(window.location.pathname).toBe(`/uploads/${CST_RESULT.upload_id}`)
  })

  it('opens the check in the address bar when the page loads', async () => {
    window.history.replaceState(null, '', `/uploads/${CST_RESULT.upload_id}`)
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT), UPLOAD_LIST))
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'CSTv2.4.xer' })).toBeInTheDocument()
  })
})
