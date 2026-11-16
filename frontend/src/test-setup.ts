// Runs before every test file.
import '@testing-library/jest-dom/vitest' // matchers like toBeInTheDocument()
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(cleanup) // remove each test's page, so the next test starts empty

// jsdom draws nothing, so it has no scrolling; the page calls this to bring a section into view
Element.prototype.scrollIntoView = () => {}
window.scrollTo = vi.fn() as typeof window.scrollTo // watched by the tests: a new page starts at its top

/** jsdom's XMLHttpRequest would go to the network. This one sends through fetch, which each test fakes,
 *  so the upload's answer comes from the test's fake backend. It reports the whole file sent at once. */
class FetchXHR {
  status = 0
  responseText = ''
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private method = 'GET'
  private url = ''
  private headers: Record<string, string> = {}
  open(method: string, url: string) {
    this.method = method
    this.url = url
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }
  send(body?: BodyInit | null) {
    globalThis.fetch(this.url, { method: this.method, body, headers: this.headers }).then(
      async (answer) => {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 1 })
        this.status = answer.status
        this.responseText = await answer.text()
        this.onload?.()
      },
      () => this.onerror?.(),
    )
  }
}
globalThis.XMLHttpRequest = FetchXHR as unknown as typeof XMLHttpRequest // set, not stubbed: unstubAllGlobals keeps it
