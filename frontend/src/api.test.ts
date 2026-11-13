import { afterEach, describe, expect, it, vi } from 'vitest'
import { UPLOADS_URL, UploadError, getUpload, listUploads, uploadXer } from './api'
import { CST_RESULT, UPLOAD_LIST, reply } from './test-data'

const FILE = new File(['ERMHDR'], 'CSTv2.4.xer')

afterEach(() => vi.unstubAllGlobals())

describe('uploadXer', () => {
  it('posts the file as the form field "file" and returns the results', async () => {
    const fetch = vi.fn().mockResolvedValue(reply(200, CST_RESULT))
    vi.stubGlobal('fetch', fetch)
    expect(await uploadXer(FILE)).toEqual(CST_RESULT)
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe(UPLOADS_URL)
    expect(options.method).toBe('POST')
    expect((options.body as FormData).get('file')).toBe(FILE)
  })

  it("shows the backend's reason when a file can't be checked", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(422, { detail: "can't be checked: the file is empty" })))
    await expect(uploadXer(FILE)).rejects.toThrow("Can't be checked: the file is empty.")
  })

  it('shows the status code when the error has no reason', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Too large</html>', { status: 413 })))
    await expect(uploadXer(FILE)).rejects.toThrow('The request failed (error 413).')
  })

  it('says the server is down when there is no answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(uploadXer(FILE)).rejects.toBeInstanceOf(UploadError)
  })
})

describe('saved uploads', () => {
  it('lists them from GET /api/uploads', async () => {
    const fetch = vi.fn().mockResolvedValue(reply(200, UPLOAD_LIST))
    vi.stubGlobal('fetch', fetch)
    expect(await listUploads()).toEqual(UPLOAD_LIST)
    expect(fetch.mock.calls[0][0]).toBe(UPLOADS_URL)
  })

  it('opens one from GET /api/uploads/{id}', async () => {
    const fetch = vi.fn().mockResolvedValue(reply(200, CST_RESULT))
    vi.stubGlobal('fetch', fetch)
    expect(await getUpload(CST_RESULT.upload_id)).toEqual(CST_RESULT)
    expect(fetch.mock.calls[0][0]).toBe(`${UPLOADS_URL}/${CST_RESULT.upload_id}`)
  })
})
