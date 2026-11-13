import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { CST_RESULT, UPLOAD_LIST, fakeBackend, reply } from './test-data'

afterEach(() => vi.unstubAllGlobals())

/** Render the page and upload one file; the fake backend answers the upload with `upload()`. */
async function uploadWith(upload: () => Response) {
  vi.stubGlobal('fetch', fakeBackend(upload))
  render(<App />)
  await userEvent.upload(screen.getByTestId('file-input'), new File(['ERMHDR'], 'CSTv2.4.xer'))
}

describe('App', () => {
  it('starts with the upload button and a short explanation', () => {
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT)))
    render(<App />)
    expect(screen.getByRole('button', { name: 'Upload a .xer file' })).toBeEnabled()
    expect(screen.getByRole('heading', { name: 'Upload a P6 schedule' })).toBeInTheDocument()
  })

  it('shows the dashboard after an upload', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    expect(await screen.findByRole('heading', { name: 'CSTv2.4.xer' })).toBeInTheDocument()
    expect(screen.getByText('133')).toBeInTheDocument() // activities checked
    expect(screen.getByText('2 of 3')).toBeInTheDocument() // checks over the limit
    expect(screen.getByText('20 of 133 (15.0%)')).toBeInTheDocument()
    expect(screen.getByText('78 of 133 (58.6%)')).toBeInTheDocument()
    expect(screen.getByText(/Written by code/)).toBeInTheDocument()
  })

  it('lists the activities behind the first flag, then the rule you click', async () => {
    await uploadWith(() => reply(200, CST_RESULT))
    const list = () => screen.getByRole('heading', { name: /: \d+ activit/ }).closest('section')!
    expect(await screen.findByRole('heading', { name: 'Missing links: 20 activities' })).toBeInTheDocument()
    expect(within(list()).getByText('ContractNo_CAL01')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /High float/ }))
    expect(screen.getByRole('heading', { name: 'High float: 78 activities' })).toBeInTheDocument()
    expect(within(list()).getByText('ContractNo_U350')).toBeInTheDocument()
  })

  it("shows the reason when a file can't be checked", async () => {
    await uploadWith(() => reply(422, { detail: "can't be checked: the file is empty" }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't be checked: the file is empty")
  })

  it('lists recent uploads, and opens a saved one', async () => {
    vi.stubGlobal('fetch', fakeBackend(() => reply(200, CST_RESULT), UPLOAD_LIST))
    render(<App />)
    const recent = await screen.findByRole('region', { name: 'Recent uploads' })
    expect(within(recent).getByText('Couldn’t be checked: the file is empty')).toBeInTheDocument()

    await userEvent.click(within(recent).getByRole('button', { name: /CSTv2.4.xer/ }))
    expect(await screen.findByRole('heading', { name: 'CSTv2.4.xer' })).toBeInTheDocument()
    expect(screen.getByText('20 of 133 (15.0%)')).toBeInTheDocument()
  })
})
